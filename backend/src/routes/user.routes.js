const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

// Gestão de usuários protegida por RBAC (Apenas Diretoria pode criar/listar/editar/excluir usuários)
router.get('/', optionalAuth, (req, res, next) => userController.list(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => userController.getById(req, res, next));
router.post('/', authMiddleware, requireRole('diretoria'), (req, res, next) => userController.create(req, res, next));
router.put('/:id', authMiddleware, requireRole('diretoria'), (req, res, next) => userController.update(req, res, next));
router.delete('/:id', authMiddleware, requireRole('diretoria'), (req, res, next) => userController.delete(req, res, next));

module.exports = router;
