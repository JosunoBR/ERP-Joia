const { Router } = require('express');
const { dbDir } = require('../config/database');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const orderRoutes = require('./order.routes');
const supplierRoutes = require('./supplier.routes');
const productRoutes = require('./product.routes');
const auditRoutes = require('./audit.routes');
const exportRoutes = require('./export.routes');
const configRoutes = require('./config.routes');
const stockRoutes = require('./stock.routes');
const separationPresetRoutes = require('./separationPreset.routes');
const fiscalPresetRoutes = require('./fiscalPreset.routes');
const paymentConditionRoutes = require('./paymentCondition.routes');
const financialRoutes = require('./financial.routes');
const companyRoutes = require('./company.routes');
const { tenantMiddleware } = require('../middlewares/tenant.middleware');

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    product: 'Jóia ERP',
    architecture: 'Clean Architecture (Multi-Tenant + RBAC + SQLite)',
    database: 'SQLite (per-tenant isolation)',
    dbDir: dbDir,
    timestamp: new Date().toISOString()
  });
});

// Modular Routes
router.use('/auth', authRoutes);
router.use('/company', companyRoutes);

// Todas as rotas abaixo operam dentro do contexto do tenant autenticado
router.use('/users', tenantMiddleware, userRoutes);
router.use('/orders', tenantMiddleware, orderRoutes);
router.use('/suppliers', tenantMiddleware, supplierRoutes);
router.use('/products', tenantMiddleware, productRoutes);
router.use('/stock', tenantMiddleware, stockRoutes);
router.use('/config', tenantMiddleware, configRoutes);
router.use('/separation-presets', tenantMiddleware, separationPresetRoutes);
router.use('/fiscal-presets', tenantMiddleware, fiscalPresetRoutes);
router.use('/payment-conditions', tenantMiddleware, paymentConditionRoutes);
router.use('/financial', tenantMiddleware, financialRoutes);
router.use('/audit', tenantMiddleware, auditRoutes);
router.use('/export', tenantMiddleware, exportRoutes);

module.exports = router;
