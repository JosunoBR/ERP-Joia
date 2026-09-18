const { Router } = require('express');
const financialController = require('../controllers/financial.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

// Gestão Financeira protegida por RBAC (Restrito a Diretoria / Owner / Admin)
router.use(authMiddleware, requireRole('diretoria', 'owner', 'admin'));

router.get('/entries', (req, res) => financialController.getEntries(req, res));
router.get('/summary', (req, res) => financialController.getSummary(req, res));
router.get('/entries/:id', (req, res) => financialController.getEntryById(req, res));
router.post('/entries', (req, res) => financialController.createEntry(req, res));
router.put('/entries/:id', (req, res) => financialController.updateEntry(req, res));
router.post('/entries/:id/pay', (req, res) => financialController.payEntry(req, res));
router.delete('/entries/:id', (req, res) => financialController.deleteEntry(req, res));
router.post('/sync-orders', (req, res) => financialController.syncOrders(req, res));
router.post('/import-sheet', (req, res) => financialController.importSheet(req, res));

module.exports = router;
