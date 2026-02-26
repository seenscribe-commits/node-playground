const express = require('express');
const homeController = require('../controllers/homeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const accountController = require('../controllers/accountController');
const authMiddleware = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.get('/', homeController.getHome);
router.get('/about', homeController.getAbout);
router.get('/reset-password', homeController.getResetPassword);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authMiddleware, authController.changePassword);

router.get('/users', authMiddleware, userController.getUsers);
router.post('/users', authMiddleware, userController.addUser);
router.put('/users/:id', authMiddleware, userController.updateUser);
router.delete('/users/:id', authMiddleware, requireAdmin, userController.deleteUser);

router.get('/admin/accounts', authMiddleware, requireAdmin, accountController.getAccounts);
router.put('/admin/accounts/:id', authMiddleware, requireAdmin, accountController.updateAccount);
router.delete('/admin/accounts/:id', authMiddleware, requireAdmin, accountController.deleteAccount);

router.use((req, res) => {
  res.status(200).send('Hello World');
});

module.exports = router;
