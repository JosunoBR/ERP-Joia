const fs = require('fs');
const path = require('path');
const { queryAll, queryOne, execute } = require('../config/portal-database');

const BACKEND_DATA_DIR = process.env.DB_DIR || path.resolve(__dirname, '../../../backend/data');

class RootService {
  /**
   * Estatísticas globais para o dashboard do root
   */
  async getDashboardStats() {
    const totalTenants = await queryOne("SELECT COUNT(*) as count FROM tenants");
    const activeTenants = await queryOne("SELECT COUNT(*) as count FROM tenants WHERE ativo = 1");
    const totalUsers = await queryOne("SELECT COUNT(*) as count FROM portal_users WHERE role != 'root'");
    const totalModules = await queryOne("SELECT COUNT(*) as count FROM modules WHERE ativo = 1");

    return {
      totalTenants: totalTenants ? totalTenants.count : 0,
      activeTenants: activeTenants ? activeTenants.count : 0,
      totalUsers: totalUsers ? totalUsers.count : 0,
      totalModules: totalModules ? totalModules.count : 0
    };
  }

  /**
   * Lista todas as empresas com informações de uso
   */
  async listTenants() {
    const tenants = await queryAll(`
      SELECT
        t.id, t.slug, t.razaoSocial, t.nomeFantasia, t.cnpj,
        t.email, t.telefone, t.cidade, t.estado, t.plano,
        t.modulosJson,
        t.ativo, t.createdAt, t.updatedAt,
        COUNT(u.id) as totalUsuarios
      FROM tenants t
      LEFT JOIN portal_users u ON u.tenantId = t.id
      GROUP BY t.id
      ORDER BY t.createdAt DESC
    `);

    // Complementar com dados do arquivo de banco de dados e módulos
    return tenants.map(t => {
      const dbPath = path.join(BACKEND_DATA_DIR, `${t.slug}.db`);
      let dbSize = '0 KB';
      let dbExists = false;

      if (fs.existsSync(dbPath)) {
        dbExists = true;
        const stats = fs.statSync(dbPath);
        dbSize = (stats.size / 1024).toFixed(1) + ' KB';
      }

      let modules = [];
      if (t.modulosJson) {
        try {
          modules = JSON.parse(t.modulosJson);
        } catch {}
      }

      return {
        ...t,
        modules,
        dbExists,
        dbSize
      };
    });
  }

  /**
   * Alternar status ativo/inativo de um tenant
   */
  async toggleTenantStatus(tenantId) {
    const tenant = await queryOne("SELECT id, ativo FROM tenants WHERE id = ?", [tenantId]);
    if (!tenant) throw new Error('Empresa não encontrada.');

    const newStatus = tenant.ativo ? 0 : 1;
    const now = new Date().toISOString();

    await execute("UPDATE tenants SET ativo = ?, updatedAt = ? WHERE id = ?", [newStatus, now, tenantId]);
    return { id: tenantId, ativo: newStatus };
  }

  /**
   * Excluir empresa e seu respectivo banco de dados
   */
  async deleteTenant(tenantId) {
    const tenant = await queryOne("SELECT id, slug FROM tenants WHERE id = ?", [tenantId]);
    if (!tenant) throw new Error('Empresa não encontrada.');

    // 1. Remover arquivo do banco de dados SQLite do tenant se existir
    const dbPath = path.join(BACKEND_DATA_DIR, `${tenant.slug}.db`);
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
      } catch (e) {
        console.warn('Aviso ao remover arquivo .db do tenant:', e.message);
      }
    }

    // 2. Remover do portal.db (deleção em cascata)
    await execute("DELETE FROM portal_users WHERE tenantId = ?", [tenantId]);
    await execute("DELETE FROM tenant_modules WHERE tenantId = ?", [tenantId]);
    await execute("DELETE FROM tenants WHERE id = ?", [tenantId]);

    return { success: true, message: `Empresa ${tenant.slug} excluída com sucesso.` };
  }

  /**
   * Listar todos os usuários de todos os tenants
   */
  async listAllUsers() {
    return await queryAll(`
      SELECT
        u.id, u.nome, u.email, u.role, u.ativo, u.createdAt,
        t.id as tenantId, t.nomeFantasia as tenantNome, t.slug as tenantSlug
      FROM portal_users u
      LEFT JOIN tenants t ON t.id = u.tenantId
      WHERE u.role != 'root'
      ORDER BY u.createdAt DESC
    `);
  }

  /**
   * Listar todos os módulos disponíveis
   */
  async listModules() {
    return await queryAll("SELECT * FROM modules ORDER BY nome ASC");
  }

  /**
   * Obter módulos habilitados de uma empresa
   */
  async getTenantModules(tenantId) {
    return await queryAll(`
      SELECT m.id, m.nome, m.descricao, tm.enabledAt
      FROM tenant_modules tm
      JOIN modules m ON m.id = tm.moduleId
      WHERE tm.tenantId = ?
    `, [tenantId]);
  }

  /**
   * Atualizar módulos habilitados para uma empresa
   */
  async updateTenantModules(tenantId, moduleIds) {
    if (!Array.isArray(moduleIds)) throw new Error('moduleIds deve ser um array.');

    const now = new Date().toISOString();
    await execute("DELETE FROM tenant_modules WHERE tenantId = ?", [tenantId]);

    for (const modId of moduleIds) {
      await execute("INSERT INTO tenant_modules (tenantId, moduleId, enabledAt) VALUES (?, ?, ?)", [
        tenantId, modId, now
      ]);
    }

    await execute("UPDATE tenants SET modulosJson = ?, updatedAt = ? WHERE id = ?", [
      JSON.stringify(moduleIds), now, tenantId
    ]);

    return await this.getTenantModules(tenantId);
  }
}

module.exports = new RootService();
