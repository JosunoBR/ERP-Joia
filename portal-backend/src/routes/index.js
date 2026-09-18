const { Router } = require('express');
const portalRoutes = require('./portal.routes');
const rootRoutes = require('./root.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Portal Jóia ERP Central',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', portalRoutes);
router.use('/portal', portalRoutes);
router.use('/root', rootRoutes);

module.exports = router;
