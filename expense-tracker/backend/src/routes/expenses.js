const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { getExpenses, getExpense, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');

router.use(authenticate);

router.get('/', getExpenses);
router.get('/:id', getExpense);

router.post('/',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
    body('category_id').optional().isInt(),
    body('date').optional().isISO8601(),
  ],
  validate,
  createExpense
);

router.put('/:id',
  [
    body('amount').optional().isFloat({ min: 0.01 }),
    body('category_id').optional().isInt(),
    body('date').optional().isISO8601(),
  ],
  validate,
  updateExpense
);

router.delete('/:id', deleteExpense);

module.exports = router;
