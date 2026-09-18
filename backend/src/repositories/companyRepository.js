const { queryOne, execute } = require('../config/database');

class CompanyRepository {
  async getCompany(tenantSlug) {
    let row = await queryOne("SELECT * FROM company_config WHERE id = 'self'", tenantSlug);
    if (!row) {
      const now = new Date().toISOString();
      await execute(`
        INSERT INTO company_config (id, razaoSocial, nomeFantasia, cnpj, ie, endereco, cidade, estado, cep, telefone, email, logoBase64, updatedAt)
        VALUES ('self', '', '', '', '', '', '', '', '', '', '', '', ?)
      `, [now], tenantSlug);
      row = await queryOne("SELECT * FROM company_config WHERE id = 'self'", tenantSlug);
    }
    return row;
  }

  async updateCompany(data, tenantSlug) {
    const current = await this.getCompany(tenantSlug);
    const now = new Date().toISOString();

    const razaoSocial = data.razaoSocial !== undefined ? data.razaoSocial : current.razaoSocial;
    const nomeFantasia = data.nomeFantasia !== undefined ? data.nomeFantasia : current.nomeFantasia;
    const cnpj = data.cnpj !== undefined ? data.cnpj : current.cnpj;
    const ie = data.ie !== undefined ? data.ie : current.ie;
    const endereco = data.endereco !== undefined ? data.endereco : current.endereco;
    const cidade = data.cidade !== undefined ? data.cidade : current.cidade;
    const estado = data.estado !== undefined ? data.estado : current.estado;
    const cep = data.cep !== undefined ? data.cep : current.cep;
    const telefone = data.telefone !== undefined ? data.telefone : current.telefone;
    const email = data.email !== undefined ? data.email : current.email;
    const logoBase64 = data.logoBase64 !== undefined ? data.logoBase64 : current.logoBase64;

    await execute(`
      UPDATE company_config SET
        razaoSocial = ?, nomeFantasia = ?, cnpj = ?, ie = ?,
        endereco = ?, cidade = ?, estado = ?, cep = ?,
        telefone = ?, email = ?, logoBase64 = ?, updatedAt = ?
      WHERE id = 'self'
    `, [
      razaoSocial, nomeFantasia, cnpj, ie,
      endereco, cidade, estado, cep,
      telefone, email, logoBase64, now
    ], tenantSlug);

    return await this.getCompany(tenantSlug);
  }
}

module.exports = new CompanyRepository();
