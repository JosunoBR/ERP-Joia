const { queryAll, queryOne, execute } = require('../config/database');

class UserRepository {
  async findAll(tenantSlug) {
    return await queryAll(
      "SELECT id, nome, email, role, cargo, telefone, ativo, createdAt, updatedAt FROM users ORDER BY nome ASC",
      [],
      tenantSlug
    );
  }

  async findById(id, tenantSlug) {
    return await queryOne("SELECT * FROM users WHERE id = ?", [id], tenantSlug);
  }

  async findByEmailOrAlias(identifier, tenantSlug) {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    return await queryOne(
      `SELECT * FROM users 
       WHERE (
         LOWER(email) = ? 
         OR LOWER(nome) = ? 
         OR id = ?
       ) AND ativo = 1`,
      [clean, clean, clean],
      tenantSlug
    );
  }

  async create(user, tenantSlug) {
    const sql = `
      INSERT INTO users (id, nome, email, senha, role, cargo, telefone, ativo, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await execute(sql, [
      user.id,
      user.nome,
      user.email,
      user.senha,
      user.role,
      user.cargo || '',
      user.telefone || '',
      user.ativo !== undefined ? (user.ativo ? 1 : 0) : 1,
      user.createdAt,
      user.updatedAt
    ], tenantSlug);
    return await this.findById(user.id, tenantSlug);
  }

  async update(id, user, tenantSlug) {
    const fields = [];
    const params = [];

    if (user.nome !== undefined) { fields.push("nome = ?"); params.push(user.nome); }
    if (user.email !== undefined) { fields.push("email = ?"); params.push(user.email); }
    if (user.senha !== undefined && user.senha !== '') { fields.push("senha = ?"); params.push(user.senha); }
    if (user.role !== undefined) { fields.push("role = ?"); params.push(user.role); }
    if (user.cargo !== undefined) { fields.push("cargo = ?"); params.push(user.cargo); }
    if (user.telefone !== undefined) { fields.push("telefone = ?"); params.push(user.telefone); }
    if (user.ativo !== undefined) { fields.push("ativo = ?"); params.push(user.ativo ? 1 : 0); }

    fields.push("updatedAt = ?");
    params.push(new Date().toISOString());
    params.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await execute(sql, params, tenantSlug);
    return await this.findById(id, tenantSlug);
  }

  async delete(id, tenantSlug) {
    await execute("DELETE FROM users WHERE id = ?", [id], tenantSlug);
    return true;
  }
}

module.exports = new UserRepository();
