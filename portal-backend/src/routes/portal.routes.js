const { Router } = require('express');
const portalController = require('../controllers/portal.controller');

const router = Router();

// Cadastro de nova empresa e seu proprietário (owner sign-up)
router.post('/register', (req, res, next) => portalController.register(req, res, next));

// Login unificado (identifica se é Root ou Usuário de Tenant)
router.post('/login', (req, res, next) => portalController.login(req, res, next));

// Dados públicos do tenant para login ou apresentação
router.get('/tenant/:slug/config', (req, res, next) => portalController.getTenantConfig(req, res, next));

module.exports = router;
