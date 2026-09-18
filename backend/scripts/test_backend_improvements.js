const path = require('path');
const assert = require('assert');

async function runTests() {
  console.log('🧪 Iniciando Verificação Automatizada do Backend — Portal ERP Jóia...\n');

  const tenantSlug = 'test_tenant_' + Date.now();
  const { getTenantDatabase, saveAllTenantsToDisk, queryAll, queryOne } = require('../src/config/database');
  const orderRepository = require('../src/repositories/orderRepository');
  const orderService = require('../src/services/order.service');
  const financialRepo = require('../src/repositories/financialRepository');
  const backupRestoreService = require('../src/services/backupRestore.service');

  // 1. Inicializar Banco de Dados do Tenant
  console.log(`1. Testando inicialização e migração de schema para tenant: ${tenantSlug}...`);
  const db = await getTenantDatabase(tenantSlug);
  assert(db, 'Instância do banco de dados SQLite deve ser criada com sucesso.');
  console.log('   ✔ Banco SQLite do tenant inicializado com sucesso.');

  // 2. Verificar Colunas Consolidadas em purchase_orders
  console.log('2. Validando presença de colunas consolidadas em purchase_orders...');
  const tableInfo = db.exec("PRAGMA table_info(purchase_orders)");
  const cols = tableInfo[0].values.map(v => v[1]);
  const requiredCols = [
    'totalBruto', 'totalIpi', 'totalDesconto', 'totalLiquido',
    'totalGeral', 'totalVolumes', 'totalPecas', 'tipoFrete',
    'valorFrete', 'formaPagamento', 'isDraft', 'numeroPedido'
  ];

  for (const col of requiredCols) {
    assert(cols.includes(col), `Coluna ${col} deve existir em purchase_orders.`);
  }
  console.log('   ✔ Todas as colunas consolidadas estão presentes no banco.');

  // 3. Testar Sequencial Anti-Colisão
  console.log('3. Testando algoritmo de número sequencial anti-colisão (getNextNumeroPedido)...');
  const next1 = await orderService.getNextOrderNumber(tenantSlug);
  assert.strictEqual(next1, 'PED-0001', 'Primeiro número de pedido deve ser PED-0001');
  console.log(`   ✔ Próximo número gerado: ${next1}`);

  // 4. Testar Salvamento de Pedido com Campos Consolidados
  console.log('4. Testando salvamento de pedido com campos consolidados...');
  const testOrder = {
    header: {
      numeroPedido: 'PED-0001',
      fornecedor: 'Fornecedor Teste SA',
      condicaoPagamento: '30/60 Dias',
      formaPagamento: 'Boleto',
      tipoFrete: 'CIF',
      valorFrete: 0,
      descontoComercialTotal: 50.00
    },
    items: [
      {
        codigo: 'PROD-1',
        descricao: 'Produto A',
        precoUnitario: 10.00,
        qtdTotalUnidades: 100,
        qtdPacotes: 10,
        valorTotalBruto: 1000.00,
        valorIpi: 50.00,
        valorDescontoItem: 0
      }
    ],
    installments: [
      { numeroParcela: 1, valor: 500.00, dataVencimento: '2026-10-15', status: 'A Vencer' },
      { numeroParcela: 2, valor: 500.00, dataVencimento: '2026-11-15', status: 'A Vencer' }
    ]
  };

  const saveResult = await orderService.saveOrder(testOrder, tenantSlug);
  assert(saveResult.success, 'Pedido deve ser salvo com sucesso.');
  assert.strictEqual(saveResult.order.header.totalBruto, 1000);
  assert.strictEqual(saveResult.order.header.totalIpi, 50);
  assert.strictEqual(saveResult.order.header.totalDesconto, 50);
  assert.strictEqual(saveResult.order.header.totalGeral, 1000); // 1000 + 50 - 50 = 1000
  assert.strictEqual(saveResult.order.header.totalVolumes, 10);
  assert.strictEqual(saveResult.order.header.totalPecas, 100);
  console.log('   ✔ Pedido salvo com cálculo consolidado e totais corretos.');

  // 5. Testar Incremento do Número Anti-Colisão
  console.log('5. Validando se getNextOrderNumber incrementa sem colisão...');
  const next2 = await orderService.getNextOrderNumber(tenantSlug);
  assert.strictEqual(next2, 'PED-0002', 'Próximo número deve ser PED-0002');
  console.log(`   ✔ Próximo número gerado: ${next2}`);

  // 6. Testar Trava Contábil de Exclusão (Bloqueio quando há título Pago)
  console.log('6. Testando trava contábil contra exclusão de pedidos pagos...');
  const orderId = saveResult.order.header.id;
  
  // Simular título baixado como pago no financeiro
  const finEntries = await financialRepo.findByOrderId(orderId, tenantSlug);
  if (finEntries.length > 0) {
    await financialRepo.markAsPaid(finEntries[0].id, { valorPago: 500 }, tenantSlug);
    
    let deleteFailed = false;
    try {
      await orderService.deleteOrder(orderId, tenantSlug);
    } catch (err) {
      deleteFailed = true;
      assert.strictEqual(err.statusCode, 409, 'Erro deve ter status 409 Conflict');
      console.log(`   ✔ Exclusão bloqueada com segurança: "${err.message}"`);
    }
    assert(deleteFailed, 'Exclusão de pedido com boletos pagos deve obrigatoriamente falhar!');
  } else {
    console.log('   (Aviso: Nenhuma entrada financeira sincronizada automaticamente)');
  }

  // 7. Testar Exportação e Restauração de Backup do Tenant
  console.log('7. Testando exportação e restauração de backup do tenant...');
  const exported = await backupRestoreService.exportBackupData(tenantSlug);
  assert(exported.saved_orders_v1, 'Backup deve conter pedidos serializados');
  assert(exported.tenantSlug === tenantSlug, 'Backup deve conter tenantSlug correto');
  console.log('   ✔ Exportação de backup do tenant concluída.');

  const restoreResult = await backupRestoreService.restoreFromBackupData(exported, tenantSlug);
  assert(restoreResult.success, 'Restauração deve ter sucesso');
  console.log('   ✔ Restauração do backup concluída com sucesso.');

  // 8. Testar saveAllTenantsToDisk
  console.log('8. Testando saveAllTenantsToDisk (Graceful Shutdown)...');
  const count = saveAllTenantsToDisk();
  assert(count > 0, 'Pelo menos 1 tenant deve ser persistido em disco.');
  console.log(`   ✔ Persistência em lote concluída: ${count} tenant(s) gravado(s) em disco.`);

  console.log('\n🎉 TODOS OS TESTES DO BACKEND PASSARAM COM 100% DE SUCESSO!');
}

runTests().catch(err => {
  console.error('\n❌ Falha nos testes do backend:', err);
  process.exit(1);
});
