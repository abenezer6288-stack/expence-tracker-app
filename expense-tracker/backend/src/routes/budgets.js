const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { getBudgets, upsertBudget, deleteBudget } = require('../controllers/budgetController');

router.use(authenticate);

router.get('/', getBudgets);
router.post('/',
  [
    body('category_id').isInt().withMessage('Category required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
  ],
  validate,
  upsertBudget
);
router.delete('/:id', deleteBudget);

module.exports = router;
