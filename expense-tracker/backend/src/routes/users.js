const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { getProfile, updateProfile, changePassword, getCategories, exportCSV } = require('../controllers/userController');

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.get('/categories', getCategories);
router.get('/export-csv', exportCSV);

module.exports = router;
