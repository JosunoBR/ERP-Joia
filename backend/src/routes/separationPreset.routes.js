const { Router } = require('express');
const separationPresetController = require('../controllers/separationPreset.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => separationPresetController.list(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => separationPresetController.getById(req, res, next));
router.post('/', authMiddleware, requireRole('diretoria', 'deposito', 'comprador'), (req, res, next) => separationPresetController.save(req, res, next));
router.delete('/:id', authMiddleware, requireRole('diretoria', 'deposito'), (req, res, next) => separationPresetController.delete(req, res, next));

module.exports = router;
