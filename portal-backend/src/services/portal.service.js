const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { queryAll, queryOne, execute, savePortalDb } = require('../config/portal-database');

const JWT_SECRET = process.env.JWT_SECRET || 'joiaerp_secure_jwt_secret_2026_production_key';
const BACKEND_DATA_DIR = process.env.DB_DIR || path.resolve(__dirname, '../../../backend/data');

class PortalService {
  /**
   * Converte texto em slug amigável e único
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'empresa-' + Date.now();
  }

  /**
   * Cadastro completo de nova empresa e seu proprietário (Owner)
   */
  async registerTenant(companyData, ownerData) {
    const {
      razaoSocial, nomeFantasia, cnpj, ie,
      email: companyEmail, telefone, endereco,
      cidade, estado, cep, logoBase64, plano
    } = companyData;

    const {
      nome: ownerNome, email: ownerEmail, senha: ownerSenha, cargo
    } = ownerData;

    if (!razaoSocial || !nomeFantasia || !cnpj || !ownerEmail || !ownerSenha) {
      throw new Error('Preencha todos os campos obrigatórios: Razão Social, Nome Fantasia, CNPJ, E-mail e Senha do Proprietário.');
    }

    // 1. Verificar duplicidade de CNPJ no portal
    const existingCnpj = await queryOne("SELECT id FROM tenants WHERE cnpj = ?", [cnpj.trim()]);
    if (existingCnpj) {
      throw new Error('Este CNPJ já está cadastrado no sistema.');
    }

    // 2. Verificar duplicidade de E-mail do proprietário
    const existingUser = await queryOne("SELECT id FROM portal_users WHERE email = ?", [ownerEmail.trim().toLowerCase()]);
    if (existingUser) {
      throw new Error('Já existe um usuário com este e-mail no portal.');
    }

    // 3. Gerar slug único para o tenant e o banco de dados
    let baseSlug = this.generateSlug(nomeFantasia);
    let slug = baseSlug;
    let count = 1;
    while (await queryOne("SELECT id FROM tenants WHERE slug = ?", [slug])) {
      slug = `${baseSlug}-${count++}`;
    }

    const tenantId = `tenant_${crypto.randomUUID()}`;
    const ownerId = `usr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // 4. Hash da senha com bcrypt
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(ownerSenha, salt);

    // Módulos iniciais habilitados
    const defaultModules = ['compras', 'separacao', 'financeiro', 'catalogo', 'estoque', 'relatorios'];
    const modulosJson = JSON.stringify(defaultModules);

    // 5. Inserir Tenant no portal.db
    await execute(`
      INSERT INTO tenants (
        id, slug, razaoSocial, nomeFantasia, cnpj, ie,
        email, telefone, endereco, cidade, estado, cep,
        logoBase64, plano, modulosJson, ativo, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      tenantId, slug, razaoSocial.trim(), nomeFantasia.trim(), cnpj.trim(), ie ? ie.trim() : '',
      companyEmail ? companyEmail.trim() : ownerEmail.trim(), telefone ? telefone.trim() : '',
      endereco ? endereco.trim() : '', cidade ? cidade.trim() : '', estado ? estado.trim() : '',
      cep ? cep.trim() : '', logoBase64 || '', plano || 'standard', modulosJson, now, now
    ]);

    // 6. Inserir Owner no portal.db
    await execute(`
      INSERT INTO portal_users (id, tenantId, nome, email, senhaHash, role, ativo, createdAt)
      VALUES (?, ?, ?, ?, ?, 'owner', 1, ?)
    `, [ownerId, tenantId, ownerNome.trim(), ownerEmail.trim().toLowerCase(), senhaHash, now]);

    // 7. Vincular módulos habilitados
    for (const modId of defaultModules) {
      await execute(`
        INSERT INTO tenant_modules (tenantId, moduleId, enabledAt)
        VALUES (?, ?, ?)
      `, [tenantId, modId, now]);
    }

    // 8. Inicializar o Banco de Dados Individual do Tenant ({slug}.db)
    await this.initializeTenantDatabase(slug, {
      razaoSocial, nomeFantasia, cnpj, ie, endereco, cidade, estado, cep,
      telefone, email: companyEmail || ownerEmail, logoBase64
    }, {
      ownerId, ownerNome, ownerEmail, senhaHash, cargo: cargo || 'Proprietário / Diretor'
    });

    // 9. Gerar Token JWT de Acesso ao ERP com módulos habilitados
    const token = jwt.sign({
      id: ownerId,
      nome: ownerNome,
      email: ownerEmail,
      role: 'owner',
      tenantId: tenantId,
      tenantSlug: slug,
      tenantName: nomeFantasia,
      tenantModules: defaultModules
    }, JWT_SECRET, { expiresIn: '7d' });

    return {
      success: true,
      message: 'Empresa cadastrada com sucesso!',
      tenant: {
        id: tenantId,
        slug,
        nomeFantasia,
        razaoSocial,
        cnpj,
        logoBase64,
        modules: defaultModules
      },
      user: {
        id: ownerId,
        nome: ownerNome,
        email: ownerEmail,
        role: 'owner',
        tenantModules: defaultModules
      },
      token,
      erpUrl: `/?tenant=${slug}`
    };
  }

  /**
   * Cria e popula a estrutura do banco SQLite do tenant usando o schema oficial do ERP
   */
  async initializeTenantDatabase(slug, companyInfo, ownerInfo) {
    const { getTenantDatabase, saveTenantDatabaseToDisk } = require('../../../backend/src/config/database');
    const db = await getTenantDatabase(slug);
    const now = new Date().toISOString();

    // 1. Atualizar identidade da empresa em company_config
    db.run(`
      INSERT OR REPLACE INTO company_config (
        id, razaoSocial, nomeFantasia, cnpj, ie,
        endereco, cidade, estado, cep, telefone, email, logoBase64, updatedAt
      ) VALUES ('self', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyInfo.razaoSocial || '', companyInfo.nomeFantasia || '', companyInfo.cnpj || '',
      companyInfo.ie || '', companyInfo.endereco || '', companyInfo.cidade || '',
      companyInfo.estado || '', companyInfo.cep || '', companyInfo.telefone || '',
      companyInfo.email || '', companyInfo.logoBase64 || '', now
    ]);

    // 2. Inserir configuração fiscal padrão caso não exista
    const checkFiscal = db.exec("SELECT id FROM fiscal_config WHERE id = 'default'");
    if (!checkFiscal || checkFiscal.length === 0 || checkFiscal[0].values.length === 0) {
      db.run(`
        INSERT INTO fiscal_config (id, icmsAliquota, ipiAliquota, pisCofinsAliquota, custosFixos, creditoEntradaICMS, updatedAt)
        VALUES ('default', 0.11, 0.00, 0.03, 0.26, 0.195, ?)
      `, [now]);
    }

    // 3. Cadastrar o gestor/proprietário na tabela users oficial do tenant
    const cleanEmail = ownerInfo.ownerEmail.trim().toLowerCase();
    const checkUser = db.exec("SELECT id FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    if (!checkUser || checkUser.length === 0 || checkUser[0].values.length === 0) {
      db.run(`
        INSERT INTO users (id, nome, email, senha, role, cargo, ativo, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'owner', ?, 1, ?, ?)
      `, [
        ownerInfo.ownerId,
        ownerInfo.ownerNome.trim(),
        cleanEmail,
        ownerInfo.senhaHash,
        ownerInfo.cargo || 'Proprietário / Diretor',
        now,
        now
      ]);
    }

    saveTenantDatabaseToDisk(slug, db);
    return db;
  }

  /**
   * Login unificado do portal (Root ou Usuário de Tenant)
   */
  async login(email, senha) {
    if (!email || !senha) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Buscar usuário no portal_users
    const user = await queryOne("SELECT * FROM portal_users WHERE email = ?", [cleanEmail]);
    if (!user) {
      throw new Error('Usuário ou senha inválidos.');
    }

    if (!user.ativo) {
      throw new Error('Este usuário foi desativado pelo administrador.');
    }

    // 2. Validar senha
    const match = await bcrypt.compare(senha, user.senhaHash);
    if (!match) {
      throw new Error('Usuário ou senha inválidos.');
    }

    // 3. Caso ROOT (Super Admin do Sistema)
    if (user.role === 'root') {
      const token = jwt.sign({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: 'root'
      }, JWT_SECRET, { expiresIn: '1d' });

      return {
        role: 'root',
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: 'root'
        },
        redirect: '/root'
      };
    }

    // 4. Caso Usuário de Tenant
    const tenant = await queryOne("SELECT * FROM tenants WHERE id = ?", [user.tenantId]);
    if (!tenant) {
      throw new Error('A empresa vinculada a esta conta não foi encontrada.');
    }

    // Buscar módulos ativos contratados pelo tenant
    let moduleIds = ['compras', 'separacao', 'financeiro', 'catalogo', 'estoque', 'relatorios'];
    try {
      const tenantMods = await queryAll("SELECT moduleId FROM tenant_modules WHERE tenantId = ?", [tenant.id]);
      if (tenantMods && tenantMods.length > 0) {
        moduleIds = tenantMods.map(m => m.moduleId);
      } else if (tenant.modulosJson) {
        moduleIds = JSON.parse(tenant.modulosJson);
      }
    } catch (modErr) {
      console.warn('Aviso ao carregar módulos do tenant no login:', modErr.message);
    }

    const token = jwt.sign({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.nomeFantasia,
      tenantModules: moduleIds
    }, JWT_SECRET, { expiresIn: '7d' });

    return {
      role: user.role,
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        tenantModules: moduleIds
      },
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        nomeFantasia: tenant.nomeFantasia,
        razaoSocial: tenant.razaoSocial,
        logoBase64: tenant.logoBase64 || '',
        modules: moduleIds
      },
      redirect: `/?tenant=${tenant.slug}`
    };
  }

  /**
   * Obter informações públicas do tenant para personalizar tela de login
   */
  async getTenantPublicConfig(slug) {
    const tenant = await queryOne(
      "SELECT id, slug, nomeFantasia, razaoSocial, logoBase64, modulosJson, ativo FROM tenants WHERE slug = ?",
      [slug]
    );

    if (!tenant) {
      throw new Error('Empresa não encontrada.');
    }

    let modules = [];
    if (tenant.modulosJson) {
      try {
        modules = JSON.parse(tenant.modulosJson);
      } catch {}
    }

    return {
      id: tenant.id,
      slug: tenant.slug,
      nomeFantasia: tenant.nomeFantasia,
      razaoSocial: tenant.razaoSocial,
      logoBase64: tenant.logoBase64 || '',
      modules,
      ativo: !!tenant.ativo
    };
  }
}

module.exports = new PortalService();
