const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('./environment');

const dbDir = process.env.DB_DIR || path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Multi-tenant: um banco de dados por tenant
const tenantInstances = new Map();

/**
 * Retorna o caminho do banco de dados para um tenant específico.
 */
function getTenantDbPath(tenantSlug) {
  if (!tenantSlug) throw new Error('tenantSlug é obrigatório para acessar o banco de dados.');
  return path.join(dbDir, `${tenantSlug}.db`);
}

/**
 * Inicializa e retorna a instância do banco SQLite de um tenant.
 * Se o banco já estiver carregado em memória, retorna do cache.
 */
async function getTenantDatabase(tenantSlug) {
  if (!tenantSlug) throw new Error('tenantSlug é obrigatório.');

  if (tenantInstances.has(tenantSlug)) {
    return tenantInstances.get(tenantSlug);
  }

  const SQL = await initSqlJs();
  const tenantDbPath = getTenantDbPath(tenantSlug);
  let db;

  if (fs.existsSync(tenantDbPath)) {
    const fileBuffer = fs.readFileSync(tenantDbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Ativar chaves estrangeiras
  try {
    db.run("PRAGMA foreign_keys = ON;");
  } catch (e) {
    console.warn('Aviso ao ativar PRAGMA foreign_keys:', e.message);
  }

  // Criar tabelas se não existirem
  db.run(`
    CREATE TABLE IF NOT EXISTS company_config (
      id TEXT PRIMARY KEY DEFAULT 'self',
      razaoSocial TEXT,
      nomeFantasia TEXT,
      cnpj TEXT,
      ie TEXT,
      endereco TEXT,
      cidade TEXT,
      estado TEXT,
      cep TEXT,
      telefone TEXT,
      email TEXT,
      logoBase64 TEXT,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fiscal_config (
      id TEXT PRIMARY KEY,
      icmsAliquota REAL NOT NULL DEFAULT 0.11,
      ipiAliquota REAL NOT NULL DEFAULT 0.00,
      pisCofinsAliquota REAL NOT NULL DEFAULT 0.03,
      custosFixos REAL NOT NULL DEFAULT 0.26,
      creditoEntradaICMS REAL NOT NULL DEFAULT 0.195,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cluster TEXT NOT NULL,
      defaultWeight REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      razaoSocial TEXT NOT NULL,
      nomeFantasia TEXT,
      cnpj TEXT,
      vendedorPadrao TEXT,
      contatoVendedor TEXT,
      condicaoPagamentoPadrao TEXT,
      aliquotaStPadrao REAL DEFAULT 0,
      aliquotaIpiPadrao REAL DEFAULT 0,
      descontoOffPadrao REAL DEFAULT 0,
      telefoneEmpresa TEXT,
      endereco TEXT,
      email TEXT,
      observacoesDescarga TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS central_stock (
      id TEXT PRIMARY KEY,
      productId TEXT,
      codigoInterno TEXT,
      codigoFornecedor TEXT,
      codigoBarras TEXT,
      codigo TEXT,
      descricao TEXT NOT NULL,
      categoria TEXT,
      fotoUrl TEXT,
      saldoUnidades INTEGER NOT NULL DEFAULT 0,
      precoUnitario REAL NOT NULL DEFAULT 0,
      pdvSugerido REAL NOT NULL DEFAULT 0,
      localizacaoGalpao TEXT,
      fornecedorOrigem TEXT,
      dataUltimaEntrada TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      numeroPedido TEXT NOT NULL UNIQUE,
      fornecedor TEXT NOT NULL,
      supplierId TEXT,
      aliquotaSt REAL DEFAULT 0,
      vendedor TEXT,
      contatoVendedor TEXT,
      condicaoPagamento TEXT,
      formaPagamento TEXT DEFAULT 'Boleto',
      previsaoPagamento TEXT,
      tipoFrete TEXT DEFAULT 'CIF',
      valorFrete REAL DEFAULT 0,
      descontoComercialTotal REAL DEFAULT 0,
      descontoComercialTipo TEXT DEFAULT '%',
      isDraft INTEGER DEFAULT 0,
      dataPedido TEXT,
      dataEmissao TEXT,
      dataEntregaPrevista TEXT,
      percentualDescontoOff REAL DEFAULT 0,
      percentualNota REAL DEFAULT 100,
      observacoes TEXT,
      status TEXT DEFAULT 'Em Cotação',
      separationStatus TEXT DEFAULT 'Pendente',
      totalBruto REAL DEFAULT 0,
      totalIpi REAL DEFAULT 0,
      totalDesconto REAL DEFAULT 0,
      totalLiquido REAL DEFAULT 0,
      totalGeral REAL DEFAULT 0,
      totalVolumes INTEGER DEFAULT 0,
      totalPecas INTEGER DEFAULT 0,
      installmentsJson TEXT,
      fiscalConfigJson TEXT,
      aliquotaIpi REAL DEFAULT 0,
      aliquotaFrete REAL DEFAULT 0,
      aliquotaIcmsEntrada REAL DEFAULT 12,
      aliquotaCustoFixo REAL DEFAULT 26,
      aliquotaIcmsSaida REAL DEFAULT 19.5,
      aliquotaPisCofinsIr REAL DEFAULT 6,
      itemsJson TEXT NOT NULL DEFAULT '[]',
      separationDistributionJson TEXT,
      paymentConfigJson TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      codigoInterno TEXT,
      codigoFornecedor TEXT,
      codigoBarras TEXT,
      codigo TEXT,
      descricao TEXT NOT NULL,
      fotoUrl TEXT,
      qtdNoPacote REAL DEFAULT 1,
      qtdPacotes REAL DEFAULT 0,
      qtdTotalUnidades INTEGER NOT NULL DEFAULT 0,
      precoUnitario REAL NOT NULL DEFAULT 0,
      valorTotalBruto REAL NOT NULL DEFAULT 0,
      percentualDesconto REAL DEFAULT 0,
      valorDescontoItem REAL DEFAULT 0,
      valorTotalLiquido REAL DEFAULT 0,
      pdvAlvo REAL NOT NULL DEFAULT 0,
      custoLoja REAL DEFAULT 0,
      custoFornecedor REAL DEFAULT 0,
      despesasPdvUnit REAL DEFAULT 0,
      creditoIcmsUnit REAL DEFAULT 0,
      custoRealEfetivo REAL DEFAULT 0,
      margemRealUnit REAL DEFAULT 0,
      margemPercentual REAL DEFAULT 0,
      qtdReservaEstoque INTEGER DEFAULT 0,
      separacaoManual INTEGER DEFAULT 0,
      separacaoLojasJson TEXT,
      ruptura INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_installments (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      numeroParcela INTEGER NOT NULL,
      totalParcelas INTEGER NOT NULL,
      dataVencimento TEXT NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      valorOriginal REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'A Vencer',
      dataPagamento TEXT,
      observacao TEXT,
      documentoRef TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_avarias (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      codigoProduto TEXT,
      descricaoProduto TEXT,
      storeId TEXT NOT NULL,
      nomeLoja TEXT,
      quantidade INTEGER NOT NULL DEFAULT 0,
      unidadeMedida TEXT DEFAULT 'UN',
      custoUnitario REAL DEFAULT 0,
      valorPrejuizoTotal REAL DEFAULT 0,
      motivo TEXT NOT NULL,
      conferente TEXT,
      dataRegistro TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS separation_audit_logs (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      numeroPedido TEXT NOT NULL,
      conferenteNome TEXT NOT NULL,
      conferenteId TEXT,
      statusAnterior TEXT,
      novoStatus TEXT NOT NULL,
      totalItensConferidos INTEGER DEFAULT 0,
      totalDivergencias INTEGER DEFAULT 0,
      observacoes TEXT,
      fotosJson TEXT,
      romaneioDataJson TEXT,
      timestamp TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      codigo TEXT NOT NULL UNIQUE,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      subcategoria TEXT,
      fornecedorPadraoId TEXT,
      fornecedorPadraoNome TEXT,
      precoUnitarioPadrao REAL NOT NULL,
      pdvSugerido REAL NOT NULL DEFAULT 0,
      qtdPorPacote INTEGER NOT NULL DEFAULT 1,
      fotoUrl TEXT,
      ncm TEXT,
      eanBarcode TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      role TEXT NOT NULL,
      cargo TEXT,
      telefone TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS separation_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      storeWeightsJson TEXT NOT NULL,
      reserveStockPercent REAL NOT NULL DEFAULT 10,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fiscal_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      ipiAliquota REAL NOT NULL DEFAULT 0.00,
      aliquotaSt REAL NOT NULL DEFAULT 0.00,
      freteAliquota REAL NOT NULL DEFAULT 0.00,
      creditoEntradaICMS REAL NOT NULL DEFAULT 0.12,
      custosFixos REAL NOT NULL DEFAULT 0.26,
      icmsAliquota REAL NOT NULL DEFAULT 0.19,
      pisCofinsAliquota REAL NOT NULL DEFAULT 0.06,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_conditions (
      id TEXT PRIMARY KEY,
      descricao TEXT NOT NULL,
      qtdParcelas INTEGER NOT NULL DEFAULT 1,
      parcelasDiasJson TEXT NOT NULL DEFAULT '[]',
      especie TEXT DEFAULT 'Boleto',
      banco TEXT DEFAULT '',
      ativo INTEGER NOT NULL DEFAULT 1,
      padrao INTEGER NOT NULL DEFAULT 0,
      observacao TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS financial_entries (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL DEFAULT 'despesa',
      orderId TEXT,
      installmentId TEXT,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'OPERACIONAL',
      fornecedor TEXT,
      storeId TEXT,
      lojaNome TEXT,
      empresa TEXT DEFAULT '',
      formaPagamento TEXT NOT NULL DEFAULT 'BOLETO',
      bancoConta TEXT DEFAULT '',
      documentoRef TEXT DEFAULT '',
      parcelaNumero INTEGER DEFAULT 1,
      parcelaTotal INTEGER DEFAULT 1,
      parcelaDesc TEXT DEFAULT 'Única',
      dataVencimento TEXT NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'A Vencer',
      dataPagamento TEXT,
      valorPago REAL DEFAULT 0,
      observacao TEXT DEFAULT '',
      recorrente INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fin_vencimento ON financial_entries(dataVencimento);
    CREATE INDEX IF NOT EXISTS idx_fin_status ON financial_entries(status);
    CREATE INDEX IF NOT EXISTS idx_fin_categoria ON financial_entries(categoria);
    CREATE INDEX IF NOT EXISTS idx_fin_loja ON financial_entries(lojaNome);
    CREATE INDEX IF NOT EXISTS idx_fin_order ON financial_entries(orderId);
  `);

  // Migrações automáticas de colunas
  try {
    const tableInfo = db.exec("PRAGMA table_info(purchase_orders)");
    if (tableInfo[0]) {
      const colNames = tableInfo[0].values.map(v => v[1]);
      const requiredCols = {
        dataPedido: "TEXT",
        dataEmissao: "TEXT",
        dataEntregaPrevista: "TEXT",
        totalBruto: "REAL DEFAULT 0",
        totalIpi: "REAL DEFAULT 0",
        totalDesconto: "REAL DEFAULT 0",
        totalLiquido: "REAL DEFAULT 0",
        totalGeral: "REAL DEFAULT 0",
        totalVolumes: "INTEGER DEFAULT 0",
        totalPecas: "INTEGER DEFAULT 0",
        separationStatus: "TEXT DEFAULT 'Pendente'",
        observacoes: "TEXT",
        fiscalConfigJson: "TEXT",
        aliquotaIpi: "REAL DEFAULT 0",
        aliquotaFrete: "REAL DEFAULT 0",
        aliquotaIcmsEntrada: "REAL DEFAULT 12",
        aliquotaCustoFixo: "REAL DEFAULT 26",
        aliquotaIcmsSaida: "REAL DEFAULT 19.5",
        aliquotaPisCofinsIr: "REAL DEFAULT 6",
        itemsJson: "TEXT NOT NULL DEFAULT '[]'",
        separationDistributionJson: "TEXT",
        installmentsJson: "TEXT",
        percentualNota: "REAL DEFAULT 100",
        percentualDescontoOff: "REAL DEFAULT 0",
        aliquotaSt: "REAL DEFAULT 0",
        supplierId: "TEXT",
        vendedor: "TEXT",
        contatoVendedor: "TEXT",
        condicaoPagamento: "TEXT",
        formaPagamento: "TEXT",
        previsaoPagamento: "TEXT",
        paymentConfigJson: "TEXT",
        tipoFrete: "TEXT DEFAULT 'CIF'",
        valorFrete: "REAL DEFAULT 0",
        descontoComercialTotal: "REAL DEFAULT 0",
        descontoComercialTipo: "TEXT DEFAULT '%'",
        isDraft: "INTEGER DEFAULT 0"
      };

      Object.entries(requiredCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { db.run(`ALTER TABLE purchase_orders ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });
    }

    const prodTableInfo = db.exec("PRAGMA table_info(products)");
    if (prodTableInfo[0]) {
      const colNames = prodTableInfo[0].values.map(v => v[1]);
      const requiredProdCols = {
        codigoInterno: "TEXT",
        codigoFornecedor: "TEXT",
        codigoBarras: "TEXT",
        subcategoria: "TEXT",
        supplierId: "TEXT",
        nomeFornecedor: "TEXT",
        fotoUrl: "TEXT",
        qtdPorPacote: "REAL DEFAULT 1"
      };

      Object.entries(requiredProdCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { db.run(`ALTER TABLE products ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });
    }

    const supTableInfo = db.exec("PRAGMA table_info(suppliers)");
    if (supTableInfo[0]) {
      const colNames = supTableInfo[0].values.map(v => v[1]);
      const requiredSupCols = {
        pedidoPadraoJson: "TEXT",
        percentualNotaPadrao: "REAL DEFAULT 100",
        observacoes: "TEXT",
        telefoneEmpresa: "TEXT",
        endereco: "TEXT",
        email: "TEXT"
      };

      Object.entries(requiredSupCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { db.run(`ALTER TABLE suppliers ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });
    }

    const orderItemsTableInfo = db.exec("PRAGMA table_info(order_items)");
    if (orderItemsTableInfo[0]) {
      const colNames = orderItemsTableInfo[0].values.map(v => v[1]);
      const requiredItemCols = {
        codigoInterno: "TEXT",
        codigoFornecedor: "TEXT",
        percentualDesconto: "REAL DEFAULT 0",
        valorDescontoItem: "REAL DEFAULT 0",
        valorTotalLiquido: "REAL DEFAULT 0",
        qtdNoPacote: "REAL DEFAULT 1",
        qtdPorPacote: "REAL DEFAULT 1",
        qtdPacotes: "REAL DEFAULT 0",
        codigoBarras: "TEXT",
        custoLoja: "REAL DEFAULT 0",
        custoFornecedor: "REAL DEFAULT 0",
        separacaoLojasJson: "TEXT",
        separacaoManual: "INTEGER DEFAULT 0",
        qtdReservaEstoque: "INTEGER DEFAULT 0",
        ruptura: "INTEGER DEFAULT 0",
        createdAt: "TEXT",
        updatedAt: "TEXT"
      };

      Object.entries(requiredItemCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { db.run(`ALTER TABLE order_items ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });
    }

    const orderInstTableInfo = db.exec("PRAGMA table_info(order_installments)");
    if (orderInstTableInfo[0]) {
      const colNames = orderInstTableInfo[0].values.map(v => v[1]);
      const requiredInstCols = {
        isBoletoFrete: "INTEGER DEFAULT 0",
        tipoTitulo: "TEXT DEFAULT 'mercadoria'",
        createdAt: "TEXT",
        updatedAt: "TEXT"
      };

      Object.entries(requiredInstCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { db.run(`ALTER TABLE order_installments ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });
    }
  } catch (err) {
    console.error('Aviso na verificação de migrações:', err.message);
  }

  // Seed de configuração fiscal e condições de pagamento padrão (genéricos, sem identidade de empresa)
  try {
    const { runFullDatabaseSeed } = require('./seedData');
    runFullDatabaseSeed(db);
  } catch (seedErr) {
    console.error('Aviso no seeding inicial:', seedErr.message);
  }

  // Seed de modelo fiscal padrão se a tabela estiver vazia
  try {
    const fiscalPresetCheck = db.exec("SELECT COUNT(*) as count FROM fiscal_presets");
    if (fiscalPresetCheck[0] && fiscalPresetCheck[0].values[0][0] === 0) {
      const now = new Date().toISOString();
      db.run(`
        INSERT INTO fiscal_presets (
          id, name, description, ipiAliquota, aliquotaSt, freteAliquota,
          creditoEntradaICMS, custosFixos, icmsAliquota, pisCofinsAliquota,
          isDefault, createdAt, updatedAt
        ) VALUES 
          (
            'preset_fiscal_padrao',
            'Padrão Geral',
            'Padrão Geral (ICMS Entrada 12%, CF 26%, ICMS Saída 19.5%, PIS/COF 6%)',
            0.00, 0.00, 0.00, 0.12, 0.26, 0.195, 0.06, 1, '${now}', '${now}'
          );
      `);
    }
  } catch (fiscPresetErr) {
    console.warn('Aviso no seeding de fiscal_presets:', fiscPresetErr.message);
  }

  // Seed das condições de pagamento padrão
  try {
    const DEFAULT_PAYMENT_CONDITIONS = [
      { id: 'cond_7_14_21_28', descricao: '7/14/21/28 Dias', qtdParcelas: 4, parcelasDias: [7, 14, 21, 28] },
      { id: 'cond_14_21_28_35_42_49_56', descricao: '14/21/28/35/42/49/56 Dias', qtdParcelas: 7, parcelasDias: [14, 21, 28, 35, 42, 49, 56] },
      { id: 'cond_28_35_42', descricao: '28/35/42 Dias', qtdParcelas: 3, parcelasDias: [28, 35, 42] },
      { id: 'cond_28_35_42_49_56', descricao: '28/35/42/49/56 Dias', qtdParcelas: 5, parcelasDias: [28, 35, 42, 49, 56] },
      { id: 'cond_30_60', descricao: '30/60 Dias', qtdParcelas: 2, parcelasDias: [30, 60] },
      { id: 'cond_30_45_60', descricao: '30/45/60 Dias', qtdParcelas: 3, parcelasDias: [30, 45, 60] },
      { id: 'cond_30_40_50_60', descricao: '30/40/50/60 Dias', qtdParcelas: 4, parcelasDias: [30, 40, 50, 60] },
      { id: 'cond_30_60_90', descricao: '30/60/90 Dias', qtdParcelas: 3, parcelasDias: [30, 60, 90], padrao: 1 },
      { id: 'cond_30_45_60_75_90', descricao: '30/45/60/75/90 Dias', qtdParcelas: 5, parcelasDias: [30, 45, 60, 75, 90] },
      { id: 'cond_30_40_50_60_70_80_90', descricao: '30/40/50/60/70/80/90 Dias', qtdParcelas: 7, parcelasDias: [30, 40, 50, 60, 70, 80, 90] },
      { id: 'cond_30_60_90_120', descricao: '30/60/90/120 Dias', qtdParcelas: 4, parcelasDias: [30, 60, 90, 120] },
      { id: 'cond_30_45_60_75_90_105_120', descricao: '30/45/60/75/90/105/120 Dias', qtdParcelas: 7, parcelasDias: [30, 45, 60, 75, 90, 105, 120] },
      { id: 'cond_30_40_50_60_70_80_90_100_110_120', descricao: '30/40/50/60/70/80/90/100/110/120 Dias', qtdParcelas: 10, parcelasDias: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120] },
      { id: 'cond_30_60_90_120_150', descricao: '30/60/90/120/150 Dias', qtdParcelas: 5, parcelasDias: [30, 60, 90, 120, 150] },
      { id: 'cond_30_45_60_75_90_105_120_135_150', descricao: '30/45/60/75/90/105/120/135/150 Dias', qtdParcelas: 9, parcelasDias: [30, 45, 60, 75, 90, 105, 120, 135, 150] },
      { id: 'cond_30_40_50_60_70_80_90_100_110_120_130_140_150', descricao: '30/40/50/60/70/80/90/100/110/120/130/140/150 Dias', qtdParcelas: 13, parcelasDias: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150] },
      { id: 'cond_45_60_75_90', descricao: '45/60/75/90 Dias', qtdParcelas: 4, parcelasDias: [45, 60, 75, 90] },
      { id: 'cond_45_55_65_75_85_95_105_115', descricao: '45/55/65/75/85/95/105/115 Dias', qtdParcelas: 8, parcelasDias: [45, 55, 65, 75, 85, 95, 105, 115] },
      { id: 'cond_45_60_75_90_105_120', descricao: '45/60/75/90/105/120 Dias', qtdParcelas: 6, parcelasDias: [45, 60, 75, 90, 105, 120] },
      { id: 'cond_45_60_75_90_105_120_135_150', descricao: '45/60/75/90/105/120/135/150 Dias', qtdParcelas: 8, parcelasDias: [45, 60, 75, 90, 105, 120, 135, 150] },
      { id: 'cond_45_55_65_75_85_95_105_115_125_135_145_155', descricao: '45/55/65/75/85/95/105/115/125/135/145/155 Dias', qtdParcelas: 12, parcelasDias: [45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155] },
      { id: 'cond_30', descricao: '30 Dias (1x)', qtdParcelas: 1, parcelasDias: [30] },
      { id: 'cond_vista', descricao: '100% À Vista (TED/PIX)', qtdParcelas: 1, parcelasDias: [0], especie: 'Depósito' }
    ];

    const now = new Date().toISOString();
    for (const cond of DEFAULT_PAYMENT_CONDITIONS) {
      const existing = db.exec("SELECT id FROM payment_conditions WHERE id = '" + cond.id + "' OR descricao = '" + cond.descricao + "'");
      if (!existing[0] || existing[0].values.length === 0) {
        db.run(`
          INSERT INTO payment_conditions (
            id, descricao, qtdParcelas, parcelasDiasJson, especie, banco, ativo, padrao, observacao, createdAt, updatedAt
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `, [
          cond.id,
          cond.descricao,
          cond.qtdParcelas,
          JSON.stringify(cond.parcelasDias),
          cond.especie || 'Boleto',
          '',
          1,
          cond.padrao ? 1 : 0,
          'Condição pré-cadastrada no sistema',
          now,
          now
        ]);
      }
    }
  } catch (payCondErr) {
    console.warn('Aviso no seeding de payment_conditions:', payCondErr.message);
  }

  saveTenantDatabaseToDisk(tenantSlug, db);
  tenantInstances.set(tenantSlug, db);

  return db;
}

/**
 * Salva o banco de um tenant no disco.
 */
function saveTenantDatabaseToDisk(tenantSlug, dbInstance) {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const tenantDbPath = getTenantDbPath(tenantSlug);
    fs.writeFileSync(tenantDbPath, buffer);
  } catch (err) {
    console.error(`Erro ao salvar banco do tenant ${tenantSlug} no disco:`, err);
  }
}

/**
 * Compatibilidade: saveDatabaseToDisk chamada pelo middleware que resolve o tenant.
 * Necessita que req.tenantSlug esteja definido.
 */
function saveDatabaseToDisk(tenantSlug) {
  if (!tenantSlug) return;
  const db = tenantInstances.get(tenantSlug);
  if (db) saveTenantDatabaseToDisk(tenantSlug, db);
}

/**
 * Salva todas as instâncias de bancos de tenants ativas na memória para o disco.
 * Usado no Graceful Shutdown e rotinas de persistência global.
 */
function saveAllTenantsToDisk() {
  let count = 0;
  for (const [tenantSlug, db] of tenantInstances.entries()) {
    try {
      saveTenantDatabaseToDisk(tenantSlug, db);
      count++;
    } catch (e) {
      console.error(`Erro ao persistir tenant ${tenantSlug}:`, e.message);
    }
  }
  return count;
}

// Helpers de Execução de Queries (tenant-aware)
async function queryAll(sql, params = [], tenantSlug) {
  const db = await getTenantDatabase(tenantSlug);
  const safeParams = Array.isArray(params) ? params.map(p => p === undefined ? null : p) : [];
  const res = db.exec(sql, safeParams);
  if (!res[0]) return [];
  const columns = res[0].columns;
  return res[0].values.map(val => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = val[i]; });
    return obj;
  });
}

async function queryOne(sql, params = [], tenantSlug) {
  const list = await queryAll(sql, params, tenantSlug);
  return list.length > 0 ? list[0] : null;
}

async function execute(sql, params = [], tenantSlug) {
  const db = await getTenantDatabase(tenantSlug);
  const safeParams = Array.isArray(params) ? params.map(p => p === undefined ? null : p) : [];
  db.run(sql, safeParams);
  saveDatabaseToDisk(tenantSlug);
}

module.exports = {
  getTenantDatabase,
  getTenantDbPath,
  saveDatabaseToDisk,
  saveTenantDatabaseToDisk,
  saveAllTenantsToDisk,
  dbDir,
  queryAll,
  queryOne,
  execute
};

