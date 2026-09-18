const { Router } = require('express');
const supplierController = require('../controllers/supplier.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => supplierController.list(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => supplierController.getById(req, res, next));
router.post('/', optionalAuth, (req, res, next) => supplierController.save(req, res, next));
router.delete('/:id', authMiddleware, requireRole('diretoria'), (req, res, next) => supplierController.delete(req, res, next));

module.exports = router;
