const { Router } = require('express');
const stockController = require('../controllers/stock.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => stockController.list(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => stockController.getById(req, res, next));
router.post('/', optionalAuth, (req, res, next) => stockController.save(req, res, next));
router.put('/:id/balance', optionalAuth, (req, res, next) => stockController.updateBalance(req, res, next));
router.delete('/clear/all', optionalAuth, (req, res, next) => stockController.clearAll(req, res, next));
router.delete('/:id', optionalAuth, (req, res, next) => stockController.delete(req, res, next));

module.exports = router;
