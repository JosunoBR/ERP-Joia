const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbDir = process.env.PORTAL_DB_DIR || path.resolve(__dirname, '../../../backend/data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const portalDbPath = path.join(dbDir, 'portal.db');
let dbInstance = null;
let lastDbMtime = 0;

async function getPortalDb() {
  let currentMtime = 0;
  if (fs.existsSync(portalDbPath)) {
    try {
      currentMtime = fs.statSync(portalDbPath).mtimeMs;
    } catch {}
  }

  if (dbInstance && currentMtime <= lastDbMtime) {
    return dbInstance;
  }

  const SQL = await initSqlJs();
  let db;

  if (fs.existsSync(portalDbPath)) {
    const fileBuffer = fs.readFileSync(portalDbPath);
    db = new SQL.Database(fileBuffer);
    lastDbMtime = currentMtime;
  } else {
    db = new SQL.Database();
  }

  // PRAGMA foreign keys
  try {
    db.run("PRAGMA foreign_keys = ON;");
  } catch (e) {
    console.warn('Aviso PRAGMA portal db:', e.message);
  }

  // Tabelas centrais do portal
  db.run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      razaoSocial TEXT NOT NULL,
      nomeFantasia TEXT NOT NULL,
      cnpj TEXT UNIQUE NOT NULL,
      ie TEXT,
      email TEXT NOT NULL,
      telefone TEXT,
      endereco TEXT,
      cidade TEXT,
      estado TEXT,
      cep TEXT,
      logoBase64 TEXT,
      plano TEXT DEFAULT 'standard',
      modulosJson TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS portal_users (
      id TEXT PRIMARY KEY,
      tenantId TEXT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senhaHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      ativo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tenant_modules (
      tenantId TEXT NOT NULL,
      moduleId TEXT NOT NULL,
      enabledAt TEXT NOT NULL,
      PRIMARY KEY (tenantId, moduleId),
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE
    );
  `);

  // Seed de módulos padrão do sistema
  const defaultModules = [
    { id: 'compras', nome: 'Gestão de Compras', descricao: 'Emissão, precificação e acompanhamento de pedidos comerciais' },
    { id: 'separacao', nome: 'Separação e Expedição', descricao: 'Romaneios, conferência de doca e distribuição por loja' },
    { id: 'financeiro', nome: 'Módulo Financeiro', descricao: 'Boletos, contas a pagar e controle de fornecedores' },
    { id: 'catalogo', nome: 'Catálogo de Produtos', descricao: 'Gestão central de itens, códigos e fornecedores' },
    { id: 'estoque', nome: 'Estoque Central', descricao: 'Saldos de estoque e reservas no centro de distribuição' },
    { id: 'relatorios', nome: 'Relatórios e Matriz', descricao: 'Exportação em Excel/PDF e dashboards analíticos' }
  ];

  for (const mod of defaultModules) {
    const check = db.exec("SELECT id FROM modules WHERE id = ?", [mod.id]);
    if (!check || check.length === 0 || check[0].values.length === 0) {
      db.run("INSERT INTO modules (id, nome, descricao, ativo) VALUES (?, ?, ?, 1)", [mod.id, mod.nome, mod.descricao]);
    }
  }

  // Seed do usuário ROOT (Super Admin)
  const rootCheck = db.exec("SELECT id FROM portal_users WHERE role = 'root'");
  if (!rootCheck || rootCheck.length === 0 || rootCheck[0].values.length === 0) {
    const rootPass = process.env.ROOT_PASSWORD || 'JoiaAdmin2026!';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(rootPass, salt);
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO portal_users (id, tenantId, nome, email, senhaHash, role, ativo, createdAt)
      VALUES ('usr_root', NULL, 'Administrador Root', 'root@joiaerp.com', ?, 'root', 1, ?)
    `, [hash, now]);
  }

  dbInstance = db;
  savePortalDb();
  return dbInstance;
}

function savePortalDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(portalDbPath, buffer);
    if (fs.existsSync(portalDbPath)) {
      lastDbMtime = fs.statSync(portalDbPath).mtimeMs;
    }
  } catch (err) {
    console.error('Erro ao persistir portal.db no disco:', err.message);
  }
}

async function queryAll(sql, params = []) {
  const db = await getPortalDb();
  let stmt;
  try {
    stmt = db.prepare(sql);
    if (params && params.length > 0) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    return results;
  } finally {
    if (stmt) stmt.free();
  }
}

async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function execute(sql, params = []) {
  const db = await getPortalDb();
  db.run(sql, params);
  savePortalDb();
}

module.exports = {
  getPortalDb,
  savePortalDb,
  queryAll,
  queryOne,
  execute,
  portalDbPath
};
