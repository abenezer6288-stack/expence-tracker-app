const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { getMonthlySummary, getYearlySummary, getInsights } = require('../controllers/analyticsController');

router.use(authenticate);

router.get('/monthly', getMonthlySummary);
router.get('/yearly', getYearlySummary);
router.get('/insights', getInsights);

module.exports = router;
