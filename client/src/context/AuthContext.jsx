import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const loadUserInProgressRef = useRef(false);

  // Configure axios defaults
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  axios.defaults.withCredentials = true;

  // ── Axios Interceptors: Auto-refresh on 401 & Inject Token ──
  useEffect(() => {
    // 1. Request Interceptor: Always attach the latest token synchronously before request leaves.
    // This perfectly solves the race condition of components fetching data on mount before state updates.
    const requestInterceptor = axios.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        config.headers['Authorization'] = `Bearer ${currentToken}`;
      } else {
        delete config.headers['Authorization'];
      }
      return config;
    }, (error) => Promise.reject(error));

    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error, token = null) => {
      failedQueue.forEach((prom) => {
        if (error) {
          prom.reject(error);
        } else {
          prom.resolve(token);
        }
      });
      failedQueue = [];
    };

    // 2. Response Interceptor: Handle 401 errors, refresh token, and queue concurrent requests
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Skip auth routes to avoid infinite loops if refresh fails
        if (
          originalRequest.url?.includes('/api/auth/login') || 
          originalRequest.url?.includes('/api/auth/refresh-token') || 
          originalRequest.url?.includes('/api/auth/register') || 
          originalRequest.url?.includes('/api/auth/google')
        ) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            // If already refreshing, pause this request and add to queue
            return new Promise(function(resolve, reject) {
              failedQueue.push({ resolve, reject });
            })
            .then((token) => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              return axios(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const res = await axios.post('/api/auth/refresh-token');
            const newToken = res.data.token;

            localStorage.setItem('token', newToken);
            setToken(newToken);
            
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            
            processQueue(null, newToken);
            return axios(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            // Refresh failed — force logout
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    // Prevent duplicate requests (from React StrictMode in development)
    if (loadUserInProgressRef.current) {
      return;
    }

    loadUserInProgressRef.current = true;
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data.data);
    } catch (error) {
      console.error('Load user error:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      loadUserInProgressRef.current = false;
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /**
   * Email/password login
   */
  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  /**
   * Email/password registration
   */
  const register = async (name, email, password) => {
    const res = await axios.post('/api/auth/register', { name, email, password });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  /**
   * Google OAuth login — receives Google credential (ID token)
   */
  const googleLogin = async (credential) => {
    const res = await axios.post('/api/auth/google', { credential });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  /**
   * Logout — clear tokens and cookies
   */
  const logout = async () => {
    try {
      await axios.get('/api/auth/logout');
    } catch (error) {
      // Silently fail — logout local state regardless
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, googleLogin, logout, loadUser }}>
      {!loading ? children : (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading...</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
