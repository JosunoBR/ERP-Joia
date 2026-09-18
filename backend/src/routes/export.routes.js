const { Router } = require('express');
const exportController = require('../controllers/export.controller');

const router = Router();

router.post('/excel', (req, res, next) => exportController.exportExcel(req, res, next));
router.post('/pdf', (req, res, next) => exportController.exportPdf(req, res, next));
router.post('/pdf/separation', (req, res, next) => exportController.exportSeparationPdf(req, res, next));

module.exports = router;
