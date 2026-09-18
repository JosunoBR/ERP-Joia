const fiscalRepository = require('../repositories/fiscalRepository');

class ConfigController {
  async getFiscal(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const config = await fiscalRepository.getFiscalConfig(tenantSlug);
      return res.json(config);
    } catch (err) {
      next(err);
    }
  }

  async saveFiscal(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const saved = await fiscalRepository.updateFiscalConfig(req.body, tenantSlug);
      return res.json(saved);
    } catch (err) {
      next(err);
    }
  }

  async getStores(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const stores = await fiscalRepository.getStores(tenantSlug);
      return res.json(stores);
    } catch (err) {
      next(err);
    }
  }

  async saveStores(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const saved = await fiscalRepository.updateStores(req.body, tenantSlug);
      return res.json(saved);
    } catch (err) {
      next(err);
    }
  }

  async restoreBackup(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const user = req.user;
      const isAllowed = user && (
        user.id === 'usr_root' || 
        user.email === 'root' || 
        user.nome === 'Root' || 
        user.role === 'owner' || 
        user.role === 'diretoria' || 
        user.role === 'admin'
      );

      if (!isAllowed) {
        return res.status(403).json({ 
          error: 'Acesso negado. Apenas o Administrador Raiz (Root) ou a Diretoria possuem permissão para restaurar backups.' 
        });
      }

      const backupRestoreService = require('../services/backupRestore.service');
      const result = await backupRestoreService.restoreFromBackupData(req.body, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async exportBackup(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const user = req.user;
      const isAllowed = user && (
        user.id === 'usr_root' || 
        user.email === 'root' || 
        user.nome === 'Root' || 
        user.role === 'owner' || 
        user.role === 'diretoria' || 
        user.role === 'admin'
      );

      if (!isAllowed) {
        return res.status(403).json({ 
          error: 'Acesso negado. Apenas o Administrador Raiz (Root) ou a Diretoria possuem permissão para exportar backups.' 
        });
      }

      const backupRestoreService = require('../services/backupRestore.service');
      const backupData = await backupRestoreService.exportBackupData(tenantSlug);
      return res.json(backupData);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ConfigController();
