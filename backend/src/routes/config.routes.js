const { Router } = require('express');
const configController = require('../controllers/config.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/fiscal', optionalAuth, (req, res, next) => configController.getFiscal(req, res, next));
router.post('/fiscal', authMiddleware, requireRole('diretoria'), (req, res, next) => configController.saveFiscal(req, res, next));
router.get('/stores', optionalAuth, (req, res, next) => configController.getStores(req, res, next));
router.post('/stores', authMiddleware, requireRole('diretoria', 'deposito'), (req, res, next) => configController.saveStores(req, res, next));

// Backup e Restauração Segura do Banco de Dados
router.get('/export-backup', authMiddleware, (req, res, next) => configController.exportBackup(req, res, next));
router.post('/restore-backup', authMiddleware, (req, res, next) => configController.restoreBackup(req, res, next));

module.exports = router;
