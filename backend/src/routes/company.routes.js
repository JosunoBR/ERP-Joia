const { Router } = require('express');
const companyController = require('../controllers/company.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { tenantMiddleware } = require('../middlewares/tenant.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

// Informações públicas da empresa para tela de login/branding (usa tenantMiddleware via header ou query)
router.get('/public', tenantMiddleware, (req, res, next) => companyController.getPublicInfo(req, res, next));

// Obter dados completos da empresa (requer autenticação)
router.get('/', authMiddleware, tenantMiddleware, (req, res, next) => companyController.getCompany(req, res, next));

// Atualizar dados da empresa e logo (apenas owner/admin)
router.put('/', authMiddleware, tenantMiddleware, requireRole('owner', 'diretoria', 'admin'), (req, res, next) => companyController.updateCompany(req, res, next));

module.exports = router;
