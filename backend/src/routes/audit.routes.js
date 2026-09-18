const { Router } = require('express');
const auditController = require('../controllers/audit.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => auditController.list(req, res, next));
router.post('/', optionalAuth, (req, res, next) => auditController.create(req, res, next));

module.exports = router;
