const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => orderController.list(req, res, next));
router.get('/next-number', optionalAuth, (req, res, next) => orderController.getNextNumber(req, res, next));
router.get('/check-number/:numeroPedido', optionalAuth, (req, res, next) => orderController.checkNumber(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => orderController.getById(req, res, next));
router.post('/', optionalAuth, (req, res, next) => orderController.save(req, res, next));
router.post('/:id/duplicate', optionalAuth, (req, res, next) => orderController.duplicate(req, res, next));
router.put('/:id/installment', optionalAuth, (req, res, next) => orderController.updateInstallment(req, res, next));
router.delete('/:id', optionalAuth, (req, res, next) => orderController.delete(req, res, next));

module.exports = router;
