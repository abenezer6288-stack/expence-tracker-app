const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { register, login, refreshToken, forgotPassword, resetPassword, logout } = require('../controllers/authController');

router.post('/register',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  login
);

router.post('/refresh', refreshToken);
router.post('/forgot-password', body('email').isEmail(), validate, forgotPassword);
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
  ],
  validate,
  resetPassword
);
router.post('/logout', logout);

module.exports = router;
