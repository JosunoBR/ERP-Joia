// Tipos centrais do ecossistema de Compras e Separação (Jóia ERP)

export type StoreCluster = 'A' | 'B' | 'C';

export interface StoreConfig {
  id: string;
  name: string;
  cluster: StoreCluster;
  defaultWeight: number;
  active: boolean;
}

export interface SeparationPreset {
  id: string;
  name: string;
  description?: string;
  storeWeights: Record<string, number>; // { [storeId]: pesoOuPercentual }
  storeWeightsJson?: string;
  reserveStockPercent: number; // % retido no Estoque Central / CD (ex: 10)
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiscalConfig {
  // Impostos & Custos de Entrada (Custo Real Fornecedor)
  ipiAliquota: number;          // % IPI sobre produto (ex: 5.0 ou 0.05)
  aliquotaSt?: number;          // % ST sobre produto (ex: 18.0 ou 0.18)
  freteAliquota?: number;       // % Frete de Entrada sobre produto (ex: 3.5 ou 0.035)

  // Impostos & Custos de Saída (Custo Loja)
  creditoEntradaICMS: number;   // % ICMS Entrada (desconto sobre o produto, ex: 12.0 ou 0.12)
  custosFixos: number;          // % Custos Fixos (sobre PDV, ex: 26.0 ou 0.26)
  icmsAliquota: number;         // % ICMS Saída (sobre PDV, ex: 19.5 ou 0.195)
  pisCofinsAliquota: number;    // % PIS, COFINS, IR (sobre PDV, ex: 6.0 ou 0.06)
}

export interface FiscalPreset {
  id: string;
  name: string;
  description?: string;
  ipiAliquota: number;
  aliquotaSt?: number;
  freteAliquota?: number;
  creditoEntradaICMS: number;
  custosFixos: number;
  icmsAliquota: number;
  pisCofinsAliquota: number;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  vendedorPadrao?: string;
  contatoVendedor?: string;
  condicaoPagamentoPadrao?: string;
  aliquotaStPadrao?: number;    // % de ST (Substituição Tributária) cobrada por este fornecedor
  aliquotaIpiPadrao?: number;   // % de IPI
  descontoOffPadrao?: number;   // % de Desconto comercial habitual
  percentualNotaPadrao?: number; // % Nota fiscal padrão do fornecedor
  telefoneEmpresa?: string;     // Telefone institucional / fixo / WhatsApp da empresa
  email?: string;               // E-mail comercial do fornecedor
  endereco?: string;            // Endereço completo da empresa (logradouro, bairro, cidade, UF)
  observacoesDescarga?: string; // Instruções de entrega / paletes
  pedidoPadraoJson?: string;    // JSON com a grade de itens padrão deste fornecedor
  pedidoPadrao?: {
    items: OrderItem[];
    condicaoPagamento?: string;
    aliquotaSt?: number;
    descontoOff?: number;
    percentualNota?: number;
    observacoes?: string;
    savedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemFiscalOverride {
  useCustomFiscal?: boolean;
  icmsAliquota?: number;
  ipiAliquota?: number;
  aliquotaSt?: number;
  freteAliquota?: number;
  pisCofinsAliquota?: number;
  custosFixos?: number;
  creditoEntradaICMS?: number;
}

export interface Product {
  id: string;
  codigoInterno: string;        // Código de produto interno (visível em todas as telas)
  codigoFornecedor?: string;    // Código de produto do fornecedor (visível em compras/pedidos e catálogo)
  codigoBarras?: string;        // Código de barras EAN-13 (visível em catálogo, estoque, separação; oculto em compras)
  codigo?: string;              // Mantido para retrocompatibilidade (aponta para codigoInterno)
  eanBarcode?: string;          // Mantido para retrocompatibilidade (aponta para codigoBarras)
  descricao: string;
  categoria?: string;
  fotoUrl?: string;
  qtdPorPacote?: number;        // Quantidade de unidades por pacote / caixa (embalagem fechada)
  precoUnitarioPadrao: number;
  pdvSugerido?: number;
  ncm?: string;
  supplierId?: string;
  nomeFornecedor?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

// 4.1 Item em Estoque no Depósito Central (CD / Matriz)
export interface CentralStockItem {
  id: string;
  productId?: string;
  codigoInterno?: string;        // Código de produto interno
  codigoFornecedor?: string;     // Código de produto do fornecedor
  codigoBarras?: string;         // Código de barras EAN-13
  codigo: string;                // Retrocompatibilidade
  descricao: string;
  categoria?: string;
  fotoUrl?: string;
  qtdPorPacote?: number;         // @deprecated — Mantido por retrocompatibilidade
  saldoCaixas?: number;          // @deprecated — Mantido por retrocompatibilidade
  saldoUnidades: number;         // Saldo disponível em unidades no depósito (campo principal)
  precoUnitario: number;         // Custo de compra unitário
  pdvSugerido: number;           // Preço de venda pretendido
  localizacaoGalpao?: string;    // Endereço no CD (ex: "Rua B - Palete 14")
  fornecedorOrigem?: string;     // Fornecedor / Fabricante
  dataUltimaEntrada?: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  codigoInterno?: string;       // Código de produto interno (visível em todas as telas)
  codigoFornecedor?: string;    // Código de produto do fornecedor (visível na página de compras)
  codigo?: string;              // Mantido para retrocompatibilidade
  descricao: string;
  fotoUrl?: string;             // Foto/Imagem do produto (URL ou Base64)
  qtdNoPacote?: number;         // Quantidade de unidades na embalagem/pacote/caixa/fardo
  qtdPacotes?: number;          // Quantidade de embalagens/caixas compradas
  qtdPorPacote?: number;        // Retrocompatibilidade
  qtdTotalUnidades: number;     // Quantidade total de unidades compradas (= qtdNoPacote * qtdPacotes)
  precoUnitario: number;        // Preço de compra / valor do produto por unidade
  valorTotalBruto: number;      // = qtdTotalUnidades × precoUnitario
  
  // Desconto comercial por produto
  percentualDesconto?: number;  // % OFF negociado para este item (ex: 5%)
  valorDescontoItem?: number;   // Valor em R$ do desconto total do item
  valorTotalLiquido?: number;   // = valorTotalBruto - valorDescontoItem
  // Acréscimos rateados ou específicos
  freteUnitario?: number;
  stUnitario?: number;
  ipiUnitario?: number;
  aliquotaIpi?: number;         // % Alíquota de IPI (ex: 5 para 5%)
  valorIpi?: number;            // R$ Valor total de IPI calculado deste item
  difalUnitario?: number;
  
  // Limite de Preço / Engenharia Fiscal
  pdvAlvo: number;              // Preço de venda pretendido na ponta (ex: 12.00)
  fiscalOverride?: OrderItemFiscalOverride;
  
  // Colunas do modelo do sistema (Excel)
  codigoBarras?: string;        // Código de barras EAN-13
  custoLoja?: number;           // Custo Loja calculado (conforme planilha)
  custoFornecedor?: number;     // Custo Fornecedor calculado (conforme planilha)
  
  // Cálculos resultantes
  despesasPdvUnit?: number;     // PDV * % Despesas (40%)
  creditoIcmsUnit?: number;     // Compra * % Crédito (19.5%)
  custoRealEfetivo?: number;    // Compra + Despesas PDV - Crédito ICMS
  margemRealUnit?: number;      // PDV - Custo Real Efetivo
  margemPercentual?: number;    // Margem Real / PDV

  // Grade de separação por loja: { [storeId]: quantidadeCalculadaOuEditada }
  separacaoLojas?: Record<string, number>;
  separacaoManual?: boolean;    // Se foi editado manualmente
  qtdReservaEstoque?: number;   // Quantidade retida no Estoque Central / Matriz / CD
  ruptura?: boolean;            // Item em ruptura (não será entregue pelo fornecedor - descontado de todos os cálculos do pedido)
}

export type OrderStatus = 'Em Cotação' | 'Aprovado' | 'Em Distribuição' | 'Em Separação' | 'Finalizado';

export interface OrderHeader {
  id: string;
  numeroPedido: string;
  fornecedor: string;
  supplierId?: string;          // Vínculo com cadastro de fornecedor
  aliquotaSt?: number;          // % ST do Fornecedor aplicada no pedido
  aliquotaIpi?: number;         // % IPI do Fornecedor aplicada no pedido
  vendedor: string;
  contatoVendedor?: string;
  condicaoPagamento: string;
  formaPagamento?: string;      // Boleto, Depósito, Cheque, Boleto / Depósito, Boleto / Cheque
  previsaoPagamento?: string;   // Data ou texto de previsão
  tipoFrete?: 'CIF' | 'FOB' | 'Retira';
  valorFrete?: number;
  descontoComercialTotal?: number;
  descontoComercialTipo?: '%' | 'R$';
  isDraft?: boolean;
  dataPedido?: string;
  dataEmissao?: string;
  dataEntregaPrevista: string;
  percentualDescontoOff: number; // % OFF negociado
  percentualNota?: number;       // % NOTA (Percentual faturado em Nota Fiscal para média histórica)
  observacoesDescarga?: string;
  observacoes?: string;
  
  // Despesas adicionais globais a ratear
  valorFreteGlobal: number;
  valorOutrasDespesasGlobal: number;
  
  // Estrutura do Dropdown Duplo de Pagamento & Negociação Mista (Entrada à vista + Saldo a prazo)
  parcelasCount?: number;            // Quantidade de parcelas (ex: 1, 2, 3, 4...)
  prazoDias?: number | string;       // Intervalo ou dias (ex: 30, 28, 15, 21, 45, 60, 'vista', 'entrada_com_parcelamento', 'custom')
  diaVencimentoPersonalizado?: string; // Data inicial ou dia base
  dataPrimeiroVencimento?: string;    // Data programada para o 1º vencimento (ex: 12/10/2026 para pedidos sazonais/importados)
  datasVencimentoPersonalizadas?: Record<string, string>; // Mapeamento de parcela/frete -> data YYYY-MM-DD customizada
  
  // Negociação Mista: Depósito/PIX Parcelado + Saldo em Boleto Parcelado
  valorEntradaAVista?: number;       // Valor total em Depósito/PIX (R$)
  percentualEntrada?: number;        // Percentual vinculado da 1ª Condição / Depósito (% do pedido)
  isEntradaProporcional?: boolean;   // Se true (padrão), recalcula o valor em R$ proporcionalmente ao total do pedido
  depositoFormaPagamento?: string;   // Depósito, Boleto, Cheque
  depositoParcelasCount?: number;    // Quantidade de parcelas do depósito (ex: 1x, 2x, 3x, 4x...)
  depositoPrazoDias?: number | string; // Intervalo do depósito (ex: 'vista', 7, 10, 15, 30...)
  saldoFormaPagamento?: string;      // Boleto, Depósito, Cheque
  saldoParcelasCount?: number;       // Quantidade de parcelas do saldo em boleto (ex: 1x, 2x, 3x, 4x, 10x...)
  saldoPrazoDias?: number | string;  // Intervalo de vencimento do saldo em boleto (ex: 10, 15, 28, 30...)

  // Esteira Operacional & Auditoria
  status: OrderStatus | 'Rascunho';
  separationStatus?: string;
  aprovadoPor?: string;
  dataAprovacao?: string;
  liberadoPorDeposito?: string;
  dataLiberacaoSeparacao?: string;
  finalizadoPor?: string;
  dataFinalizacao?: string;

  // Resumo Financeiro Oficial Consolidado
  totalBruto?: number;
  totalIpi?: number;
  totalDesconto?: number;
  totalLiquido?: number;
  totalGeral?: number;
  totalVolumes?: number;
  totalPecas?: number;

  createdAt: string;
  updatedAt: string;
}

// Estrutura de Parcelas e Boletos Financeiros (Editáveis para Acordos Comerciais)
export interface PaymentInstallment {
  id: string;
  orderId?: string;
  numeroPedido?: string;
  fornecedor?: string;
  numeroParcela: number;
  totalParcelas: number;
  dataVencimento: string; // YYYY-MM-DD
  valor: number; // EDITÁVEL para acordos comerciais
  valorOriginal?: number; // Valor proporcional original antes de alterações
  status: 'A Vencer' | 'Vence Hoje' | 'Em Atraso' | 'Pago';
  dataPagamento?: string; // YYYY-MM-DD quando liquidado
  observacao?: string; // Motivo do acordo comercial / desconto / abatimento
  documentoRef?: string; // Código de barras / Boleto / NF
  isBoletoFrete?: boolean; // Identificador de boleto de frete (gerado 10 dias após entrega)
  isEntrada?: boolean;     // Identificador de parcela de entrada/depósito
  tipoTitulo?: 'mercadoria' | 'frete';
  metodoPagamento?: 'Boleto' | 'Depósito' | 'Cheque' | 'PIX' | string;
  updatedAt?: string;
}

// Estrutura de Registro e Quantificação de Avarias e Perdas
export interface AvariaRecord {
  id: string;
  itemId: string;
  codigoProduto?: string;
  descricaoProduto?: string;
  storeId: string;
  nomeLoja?: string;
  quantidade: number;
  unidadeMedida?: 'UN' | 'CX' | 'PCT' | 'JG' | 'PAR' | string;
  custoUnitario?: number;
  valorPrejuizoTotal?: number; // quantidade * custoUnitario
  motivo: string;
  conferente?: string;
  dataRegistro?: string;
}

export interface OrderInspection {
  conferente?: string;
  dataConferencia?: string;
  possuiAvarias: boolean;
  observacoesDoca?: string;
  avarias: AvariaRecord[];
  totalPrejuizoAvarias?: number;
}

export interface PurchaseOrder {
  id?: string;
  header: OrderHeader;
  items: OrderItem[];
  fiscalConfig: FiscalConfig;
  storeConfigs: StoreConfig[];
  inspection?: OrderInspection;
  installments?: PaymentInstallment[];
}

// 7. Tipos de Usuários & Níveis de Acesso (RBAC: Owner, Diretoria, Depósito, Separação, Root)
export type UserRole = 'owner' | 'diretoria' | 'deposito' | 'separacao' | 'root' | 'comprador' | 'conferente';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  cargo?: string;
  telefone?: string;
  ativo?: number | boolean;
  token?: string;
  tenantSlug?: string;
  tenantName?: string;
  tenantLogo?: string;
  tenantModules?: string[];
  isRootSupport?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 8. Condição de Pagamento
export interface PaymentCondition {
  id: string;
  descricao: string;
  qtdParcelas: number;
  parcelasDias: number[]; // ex: [30, 60, 90, 120]
  parcelasDiasJson?: string;
  especie: string;        // 'Boleto' | 'Dinheiro / PIX' | 'Cartão de Crédito' | 'Cheque' | 'Depósito'
  banco?: string;
  ativo: boolean;
  padrao?: boolean;
  observacao?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 9. Módulo Financeiro ERP & Contas a Pagar
export type FinancialCategory = 'FIXO' | 'PRODUTOS' | 'RH' | 'OPERACIONAL' | 'IMPOSTOS' | 'INVESTIMENTOS' | 'OUTROS';

export type FinancialPaymentMethod = 'BOLETO' | 'DINHEIRO' | 'PIX' | 'DEPÓSITO' | 'CARTAO' | 'CHEQUE' | string;

export type FinancialStatus = 'A Vencer' | 'Vence Hoje' | 'Em Atraso' | 'Pago' | 'Cancelado';

export interface FinancialEntry {
  id: string;
  tipo: 'despesa' | 'pedido_parcela';
  orderId?: string | null;
  installmentId?: string | null;
  descricao: string;
  categoria: FinancialCategory;
  fornecedor?: string;
  storeId?: string;
  lojaNome?: string;
  empresa?: string; // 'ALS' | 'CONECTA' | 'Matriz Central'
  formaPagamento: FinancialPaymentMethod;
  bancoConta?: string;
  documentoRef?: string;
  parcelaNumero: number;
  parcelaTotal: number;
  parcelaDesc: string; // ex: "1/3", "5/9" ou "Única"
  dataVencimento: string; // YYYY-MM-DD
  valor: number;
  status: FinancialStatus;
  dataPagamento?: string | null; // YYYY-MM-DD
  valorPago?: number;
  observacao?: string;
  recorrente?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinancialDaySummary {
  dia: number;
  dataIso: string;
  total: number;
  pago: number;
  aPagar: number;
  count: number;
}

export interface FinancialSummary {
  totalGeral: number;
  totalPago: number;
  totalAberto: number;
  totalVenceHoje: number;
  countVenceHoje: number;
  totalEmAtraso: number;
  countEmAtraso: number;
  totalEntries: number;
  byCategory: Record<string, { total: number; count: number; pago: number }>;
  byStore: Record<string, { total: number; count: number; pago: number }>;
  dailyList: FinancialDaySummary[];
}

