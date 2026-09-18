const { Router } = require('express');
const rootController = require('../controllers/root.controller');
const { portalAuthMiddleware, requireRoot } = require('../middlewares/auth.middleware');

const router = Router();

// Todas as rotas abaixo exigem autenticação do usuário ROOT
router.use(portalAuthMiddleware, requireRoot);

// Estatísticas globais
router.get('/stats', (req, res, next) => rootController.getStats(req, res, next));

// Gestão de empresas
router.get('/tenants', (req, res, next) => rootController.listTenants(req, res, next));
router.post('/tenants/:id/toggle', (req, res, next) => rootController.toggleTenant(req, res, next));
router.delete('/tenants/:id', (req, res, next) => rootController.deleteTenant(req, res, next));

// Gestão de módulos por empresa
router.get('/tenants/:id/modules', (req, res, next) => rootController.getTenantModules(req, res, next));
router.put('/tenants/:id/modules', (req, res, next) => rootController.updateTenantModules(req, res, next));

// Gestão global de usuários
router.get('/users', (req, res, next) => rootController.listUsers(req, res, next));

// Lista de módulos disponíveis no sistema
router.get('/modules', (req, res, next) => rootController.listModules(req, res, next));

module.exports = router;
