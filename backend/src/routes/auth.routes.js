const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

module.exports = router;
