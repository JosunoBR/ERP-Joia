const { Router } = require('express');
const fiscalPresetController = require('../controllers/fiscalPreset.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => fiscalPresetController.list(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => fiscalPresetController.getById(req, res, next));
router.post('/', authMiddleware, requireRole('diretoria', 'comprador', 'deposito'), (req, res, next) => fiscalPresetController.save(req, res, next));
router.delete('/:id', authMiddleware, requireRole('diretoria', 'comprador'), (req, res, next) => fiscalPresetController.delete(req, res, next));

module.exports = router;
