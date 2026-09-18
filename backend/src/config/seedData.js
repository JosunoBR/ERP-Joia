/**
 * Seeder de Configurações Estruturais Genéricas — Jóia ERP
 * Inicializa apenas configuração fiscal padrão. Lojas, fornecedores, produtos e
 * pedidos iniciam zerados e devem ser cadastrados pelo proprietário do tenant.
 */

function runFullDatabaseSeed(db) {
  const now = new Date().toISOString();

  // 1. Configuração Fiscal Padrão Global (se a tabela estiver vazia)
  const fiscalCheck = db.exec("SELECT COUNT(*) as count FROM fiscal_config");
  const fiscalConfig = {
    icmsAliquota: 0.11,
    ipiAliquota: 0.00,
    pisCofinsAliquota: 0.03,
    custosFixos: 0.26,
    creditoEntradaICMS: 0.195
  };

  if (!fiscalCheck[0] || fiscalCheck[0].values[0][0] === 0) {
    db.run(`
      INSERT INTO fiscal_config (id, icmsAliquota, ipiAliquota, pisCofinsAliquota, custosFixos, creditoEntradaICMS, updatedAt)
      VALUES ('global', ?, ?, ?, ?, ?, ?)
    `, [fiscalConfig.icmsAliquota, fiscalConfig.ipiAliquota, fiscalConfig.pisCofinsAliquota, fiscalConfig.custosFixos, fiscalConfig.creditoEntradaICMS, now]);
  }

  // Lojas, fornecedores, produtos e pedidos permanecem vazios.
  // O proprietário do tenant cadastra suas próprias lojas após o primeiro acesso.
}

module.exports = {
  runFullDatabaseSeed
};
