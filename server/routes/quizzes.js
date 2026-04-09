import express from 'express';
import Quiz from '../models/Quiz.js';
import Enrollment from '../models/Enrollment.js';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @desc    Get quiz by ID (hides correct answers for students)
 * @route   GET /api/quizzes/:id
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    // For admin/instructor, return full quiz
    if (req.user.role === 'admin' || req.user.role === 'instructor') {
      return res.status(200).json({ success: true, data: quiz });
    }

    // For students, hide correct answers and explanations
    const obfuscatedQuiz = JSON.parse(JSON.stringify(quiz));
    obfuscatedQuiz.questions.forEach(q => {
      q.options.forEach(opt => delete opt.isCorrect);
      delete q.explanation;
    });

    res.status(200).json({ success: true, data: obfuscatedQuiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Submit quiz for grading (handles MCQ, true-false, multi-answer)
 * @route   POST /api/quizzes/:id/submit
 * @access  Private
 */
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    // Check max attempts
    const enrollment = await Enrollment.findOne({ user: req.user.id, course: quiz.course });
    if (enrollment) {
      const existingScore = enrollment.progress.quizScores.find(
        qs => qs.quiz.toString() === quiz._id.toString()
      );
      if (existingScore && existingScore.attempts >= quiz.maxAttempts) {
        return res.status(400).json({
          success: false,
          message: `Maximum attempts (${quiz.maxAttempts}) exceeded for this quiz`,
        });
      }
    }

    const { answers } = req.body; // Array of { questionId, selectedOptionIds: [] }
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'Please provide answers array' });
    }

    let earnedPoints = 0;
    let totalPoints = 0;
    const results = [];

    quiz.questions.forEach((q) => {
      totalPoints += q.points;
      const userAnswer = answers.find(a => a.questionId === q._id.toString());

      let isCorrect = false;

      if (userAnswer) {
        if (q.type === 'multi-answer') {
          // Multi-answer: all correct options must be selected, no incorrect ones
          const correctIds = q.options.filter(o => o.isCorrect).map(o => o._id.toString());
          const selectedIds = userAnswer.selectedOptionIds || [];
          isCorrect =
            correctIds.length === selectedIds.length &&
            correctIds.every(id => selectedIds.includes(id));
        } else {
          // Multiple-choice / true-false: single selection
          const selectedId = userAnswer.selectedOptionIds?.[0] || userAnswer.selectedOptionId;
          if (selectedId) {
            const selected = q.options.find(opt => opt._id.toString() === selectedId);
            isCorrect = selected?.isCorrect === true;
          }
        }
      }

      if (isCorrect) {
        earnedPoints += q.points;
      }

      results.push({
        questionId: q._id,
        correct: isCorrect,
        explanation: q.explanation,
        points: q.points,
        earned: isCorrect ? q.points : 0,
      });
    });

    const percentScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = percentScore >= quiz.passingScore;

    // Update Enrollment progress
    if (enrollment) {
      const existingIdx = enrollment.progress.quizScores.findIndex(
        qs => qs.quiz.toString() === quiz._id.toString()
      );

      if (existingIdx !== -1) {
        const existing = enrollment.progress.quizScores[existingIdx];
        existing.score = Math.max(existing.score, percentScore);
        existing.passed = existing.passed || passed;
        existing.attempts += 1;
      } else {
        enrollment.progress.quizScores.push({
          quiz: quiz._id,
          score: percentScore,
          passed,
          attempts: 1,
        });
      }

      // Final quiz certification
      if (quiz.isFinal && passed && !enrollment.certificateId) {
        enrollment.certificateId = `CERT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        enrollment.completedAt = new Date();
        enrollment.status = 'completed';

        await Notification.create({
          user: req.user.id,
          type: 'system',
          message: `Congratulations! You passed the final exam for "${quiz.title}" and earned your certificate!`,
          link: `/certificate/${enrollment.certificateId}`,
        });
      }

      await enrollment.save();
    }

    res.status(200).json({
      success: true,
      data: {
        score: Math.round(percentScore * 100) / 100,
        passed,
        earnedPoints,
        totalPoints,
        results,
        certificateId: enrollment?.certificateId || null,
        attemptsUsed: enrollment?.progress?.quizScores?.find(
          qs => qs.quiz.toString() === quiz._id.toString()
        )?.attempts || 1,
        maxAttempts: quiz.maxAttempts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Create quiz (Admin/Instructor)
 * @route   POST /api/quizzes
 * @access  Private
 */
router.post('/', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.create(req.body);
    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Get all quizzes (Admin/Instructor)
 * @route   GET /api/quizzes
 * @access  Private
 */
router.get('/', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .populate('course', 'title')
      .populate('module', 'title')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: quizzes.length, data: quizzes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Update quiz (Admin/Instructor)
 * @route   PUT /api/quizzes/:id
 * @access  Private
 */
router.put('/:id', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Delete quiz (Admin/Instructor)
 * @route   DELETE /api/quizzes/:id
 * @access  Private
 */
router.delete('/:id', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    await quiz.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
