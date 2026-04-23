import User from '../models/User.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ============================================
// HELPERS
// ============================================

/**
 * Create access + refresh tokens, set httpOnly cookies, and send response.
 */
const sendTokenResponse = async (user, statusCode, res) => {
  const accessToken = user.getSignedJwtToken();
  const refreshToken = user.getRefreshToken();

  // Persist refresh token and update lastLogin
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const accessOptions = {
    expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    httpOnly: true,
    sameSite: 'lax',
  };

  const refreshOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    sameSite: 'lax',
    path: '/api/auth/refresh-token',
  };

  if (process.env.NODE_ENV === 'production') {
    accessOptions.secure = true;
    refreshOptions.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', accessToken, accessOptions)
    .cookie('refreshToken', refreshToken, refreshOptions)
    .json({
      success: true,
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
};

// ============================================
// CONTROLLERS
// ============================================

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide name, email, and password');
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200`;

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      avatar: avatarUrl,
    });

    await sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide an email and password');
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    if (user.status === 'suspended') {
      res.status(403);
      throw new Error('Your account has been suspended. Contact support.');
    }

    if (!user.password) {
      res.status(400);
      throw new Error('This account uses Google sign-in. Please log in with Google.');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Google OAuth login / signup
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400);
      throw new Error('Google credential is required');
    }

    // Verify the Google ID token
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      res.status(401);
      throw new Error('Invalid Google credential');
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      res.status(400);
      throw new Error('Google account must have an email');
    }

    // Check if user exists by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Link Google ID if the user registered via email/password previously
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture && user.avatar === 'default_avatar.jpg') {
          user.avatar = picture;
        }
        await user.save({ validateBeforeSave: false });
      }

      if (user.status === 'suspended') {
        res.status(403);
        throw new Error('Your account has been suspended. Contact support.');
      }
    } else {
      // Create new user from Google profile
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email.split('@')[0])}&background=random&color=fff&size=200`;
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId,
        avatar: picture || defaultAvatar,
        role: 'student',
      });
    }

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google Login Error:', error);
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public (uses refresh token cookie)
 */
export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401);
      throw new Error('No refresh token provided');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      res.status(401);
      throw new Error('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      res.status(401);
      throw new Error('Refresh token mismatch — please log in again');
    }

    if (user.status === 'suspended') {
      res.status(403);
      throw new Error('Your account has been suspended');
    }

    // Issue new access token
    const newAccessToken = user.getSignedJwtToken();

    res
      .status(200)
      .cookie('token', newAccessToken, {
        expires: new Date(Date.now() + 15 * 60 * 1000),
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      .json({
        success: true,
        token: newAccessToken,
      });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log user out / clear cookies
 * @route   GET /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    // Clear refresh token from DB if user is authenticated
    if (req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
      } catch (_) {
        // Token might be expired, that's fine
      }
    }

    res
      .cookie('token', 'none', { expires: new Date(Date.now() + 5 * 1000), httpOnly: true })
      .cookie('refreshToken', 'none', { expires: new Date(Date.now() + 5 * 1000), httpOnly: true, path: '/api/auth/refresh-token' })
      .status(200)
      .json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgotpassword
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      res.status(404);
      throw new Error('No user found with that email');
    }

    if (user.googleId && !user.password) {
      res.status(400);
      throw new Error('This account uses Google sign-in. Please log in with Google.');
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/resetpassword/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Fwtion — Password Reset',
        html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 10 minutes.</p>`,
      });

      res.status(200).json({ success: true, data: 'Reset email sent' });
    } catch (err) {
      console.error('Email send error:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      res.status(500);
      throw new Error('Email could not be sent');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   PUT /api/auth/resetpassword/:resettoken
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired reset token');
    }

    if (!req.body.password || req.body.password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user details
 * @route   PUT /api/auth/updatedetails
 * @access  Private
 */
export const updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {};
    if (req.body.name) fieldsToUpdate.name = req.body.name;
    if (req.body.email) fieldsToUpdate.email = req.body.email;
    if (req.body.avatar) fieldsToUpdate.avatar = req.body.avatar;

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/updatepassword
 * @access  Private
 */
export const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!user.password) {
      res.status(400);
      throw new Error('Cannot update password for Google-only accounts. Set a password first.');
    }

    if (!(await user.matchPassword(req.body.currentPassword))) {
      res.status(401);
      throw new Error('Current password is incorrect');
    }

    if (!req.body.newPassword || req.body.newPassword.length < 6) {
      res.status(400);
      throw new Error('New password must be at least 6 characters');
    }

    user.password = req.body.newPassword;
    await user.save();

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};
