import { 
  PurchaseOrder, 
  OrderItem, 
  Supplier, 
  StoreConfig, 
  FiscalConfig,
  PaymentInstallment 
} from '../../shared/types';
import { ParsedExcelOrder, CatalogProductStatus } from './types';
import { calculateItemFiscal } from '../../shared/fiscalEngine';
import { calculateAutomaticSeparation } from '../../shared/separationEngine';
import { generateOrderInstallments, parsePaymentConditionString } from '../../utils/installments';
import { ensureTrailingBlankItem } from '../../utils/orderItemUtils';
import { getNextOrderNumber } from '../../utils/storage';

/**
 * Converte os dados estruturados da planilha em um PurchaseOrder pronto para o sistema.
 */
export function mapParsedExcelToOrder(
  parsed: ParsedExcelOrder,
  supplier: Supplier,
  statusList: CatalogProductStatus[],
  storeConfigs: StoreConfig[] = [],
  fiscalConfig?: FiscalConfig,
  customNumeroPedido?: string
): PurchaseOrder {
  const now = new Date().toISOString();
  const orderId = 'po_' + Date.now();

  // 1. Configurações Fiscais consolidadas
  const aliquotaIpi = parsed.fiscalParams?.ipiAliquota !== undefined 
    ? parsed.fiscalParams.ipiAliquota * 100 
    : (supplier.aliquotaIpiPadrao || 0);

  const aliquotaSt = parsed.fiscalParams?.aliquotaSt !== undefined 
    ? parsed.fiscalParams.aliquotaSt * 100 
    : (supplier.aliquotaStPadrao || 0);

  const aliquotaIcmsEntrada = parsed.fiscalParams?.icmsAliquota !== undefined 
    ? parsed.fiscalParams.icmsAliquota * 100 
    : 11.0;

  const aliquotaCustoFixo = parsed.fiscalParams?.custosFixos !== undefined 
    ? parsed.fiscalParams.custosFixos * 100 
    : 26.0;

  const aliquotaIcmsSaida = parsed.fiscalParams?.creditoEntradaICMS !== undefined 
    ? parsed.fiscalParams.creditoEntradaICMS * 100 
    : 19.5;

  const aliquotaPisCofinsIr = parsed.fiscalParams?.pisCofinsAliquota !== undefined 
    ? parsed.fiscalParams.pisCofinsAliquota * 100 
    : 3.0;

  const currentFiscalConfig: FiscalConfig = fiscalConfig || {
    icmsAliquota: aliquotaIcmsEntrada / 100,
    ipiAliquota: aliquotaIpi / 100,
    aliquotaSt: aliquotaSt / 100,
    pisCofinsAliquota: aliquotaPisCofinsIr / 100,
    custosFixos: aliquotaCustoFixo / 100,
    creditoEntradaICMS: aliquotaIcmsSaida / 100
  };

  // 2. Mapeamento dos Itens
  const orderItems: OrderItem[] = parsed.items.map((rawItem, index) => {
    const itemId = `item_${orderId}_${index + 1}`;
    const statusObj = statusList.find(s => s.rawItem.rowNumber === rawItem.rowNumber);
    const finalCode = statusObj?.assignedCode || rawItem.codigo;

    // Regra Fundamental: Se a planilha possui desconto por item explícito, preserva-o.
    // Se possui apenas % OFF no cabeçalho, o preço unitário da planilha já reflete o valor líquido negociado,
    // e o % OFF do cabeçalho é registrado como referência e condição comercial sem duplicar abatimento.
    const precoUnitario = rawItem.precoUnitario;
    const qtdTotalUnidades = rawItem.qtdTotalUnidades;
    const valorTotalBruto = qtdTotalUnidades * precoUnitario;
    const percentualDesconto = rawItem.percentualDesconto || 0;
    const valorDescontoItem = rawItem.valorDescontoItem !== undefined 
      ? rawItem.valorDescontoItem 
      : (percentualDesconto > 0 ? Number((valorTotalBruto * (percentualDesconto / 100)).toFixed(2)) : 0);
    const valorTotalLiquido = Math.max(0, valorTotalBruto - valorDescontoItem);
    const pdvAlvo = rawItem.pdvSugerido || 0;

    // Cálculo fiscal do item
    const fiscalRes = calculateItemFiscal(precoUnitario, pdvAlvo, currentFiscalConfig);

    // Separação de lojas:
    // Se a planilha tinha separação preenchida para este código, usa ela;
    // Senão, calcula a separação automática proporcional aos clusters das lojas ativas.
    let separacaoLojas: Record<string, number> = {};
    let qtdReservaEstoque = 0;

    let hasSpreadsheetSeparation = false;
    if (parsed.storeAllocations) {
      const itemAllocations: Record<string, number> = {};
      let allocCount = 0;
      for (const [storeName, itemsMap] of Object.entries(parsed.storeAllocations)) {
        const qty = itemsMap[rawItem.codigo] || itemsMap[finalCode] || 0;
        if (qty > 0) {
          // Tenta associar com o id da loja cadastrada no sistema
          const matchedStore = storeConfigs.find(s => 
            s.name.toLowerCase().trim() === storeName.toLowerCase().trim() ||
            storeName.toLowerCase().includes(s.name.toLowerCase().trim())
          );
          const storeKey = matchedStore ? matchedStore.id : storeName;
          itemAllocations[storeKey] = qty;
          allocCount += qty;
        }
      }
      if (allocCount > 0) {
        separacaoLojas = itemAllocations;
        qtdReservaEstoque = Math.max(0, qtdTotalUnidades - allocCount);
        hasSpreadsheetSeparation = true;
      }
    }

    if (!hasSpreadsheetSeparation && storeConfigs.length > 0 && qtdTotalUnidades > 0) {
      const sepAuto = calculateAutomaticSeparation(qtdTotalUnidades, storeConfigs);
      separacaoLojas = sepAuto.allocations;
      qtdReservaEstoque = sepAuto.reserveStock;
    }

    const orderItem: OrderItem = {
      id: itemId,
      codigo: finalCode,
      codigoInterno: finalCode,
      codigoFornecedor: rawItem.codigoFornecedor || rawItem.codigo,
      codigoBarras: rawItem.eanBarcode || undefined,
      descricao: rawItem.descricao,
      qtdNoPacote: rawItem.qtdNoPacote,
      qtdPorPacote: rawItem.qtdNoPacote || 1,
      qtdPacotes: rawItem.qtdPacotes,
      qtdTotalUnidades,
      precoUnitario,
      valorTotalBruto,
      percentualDesconto,
      valorDescontoItem,
      valorTotalLiquido,
      aliquotaIpi: rawItem.aliquotaIpi !== undefined ? rawItem.aliquotaIpi : undefined,
      valorIpi: rawItem.valorIpi !== undefined ? rawItem.valorIpi : (rawItem.aliquotaIpi ? (valorTotalBruto * (rawItem.aliquotaIpi / 100)) : undefined),
      pdvAlvo,
      custoLoja: fiscalRes.custoLoja,
      custoFornecedor: fiscalRes.custoFornecedor,
      despesasPdvUnit: fiscalRes.despesasPdvUnit,
      creditoIcmsUnit: fiscalRes.creditoIcmsUnit,
      custoRealEfetivo: fiscalRes.custoRealEfetivo,
      margemRealUnit: fiscalRes.margemRealUnit,
      margemPercentual: fiscalRes.margemPercentual,
      qtdReservaEstoque,
      separacaoManual: hasSpreadsheetSeparation,
      separacaoLojas
    };

    return orderItem;
  });

  // Garante a linha final vazia para edição rápida conforme padrão do sistema
  const finalItemsWithTrailingBlank = ensureTrailingBlankItem(orderItems, currentFiscalConfig, storeConfigs);

  // 3. Montagem do Cabeçalho do Pedido (PurchaseOrderHeader)
  const totalPecas = orderItems.reduce((acc, it) => acc + (it.qtdTotalUnidades || 0), 0);
  const totalLiquido = orderItems.reduce((acc, it) => acc + (it.valorTotalLiquido || 0), 0);

  // Valida e sanitiza o número do pedido garantindo o padrão limpo e sequencial oficial
  const candidateNum = (customNumeroPedido || parsed.header.numeroPedido || '').trim();
  const isBogus = !candidateNum ||
    candidateNum.toUpperCase().includes('FORNECEDOR') ||
    candidateNum.toUpperCase().includes('IMPORTADO') ||
    candidateNum.toUpperCase().includes('FORNEC') ||
    candidateNum.toUpperCase().includes('PLANILHA');

  const finalNumeroPedido = !isBogus ? candidateNum : getNextOrderNumber();

  const header = {
    id: orderId,
    numeroPedido: finalNumeroPedido,
    fornecedor: supplier.razaoSocial || parsed.header.fornecedorNome,
    supplierId: supplier.id,
    cnpj: supplier.cnpj || parsed.header.cnpj || '',
    vendedor: parsed.header.vendedor || supplier.vendedorPadrao || '',
    contatoVendedor: parsed.header.contatoVendedor || supplier.contatoVendedor || '',
    ...(() => {
      const rawCond = parsed.header.condicaoPagamento || supplier.condicaoPagamentoPadrao || '30/60/90 Dias';
      const parsedCond = parsePaymentConditionString(rawCond);
      const isComposite = parsedCond.prazo === 'deposito_e_boleto' || ((rawCond.toLowerCase().includes('depósito') || rawCond.toLowerCase().includes('deposito')) && (rawCond.toLowerCase().includes('boleto') || rawCond.toLowerCase().includes('saldo')));
      return {
        condicaoPagamento: rawCond,
        formaPagamento: isComposite ? 'Boleto / Depósito' : (parsedCond.prazo === 'vista' ? 'Depósito' : 'Boleto'),
        prazoDias: parsedCond.prazo,
        parcelasCount: parsedCond.parcelas
      };
    })(),
    dataPedido: parsed.header.dataPedido,
    dataEntregaPrevista: parsed.header.dataEntregaPrevista,
    percentualDescontoOff: (parsed.header.percentualDescontoOff !== undefined && parsed.header.percentualDescontoOff > 0)
      ? parsed.header.percentualDescontoOff 
      : (supplier.descontoOffPadrao || 0),
    percentualNota: parsed.header.percentualNota !== undefined 
      ? parsed.header.percentualNota 
      : (supplier.percentualNotaPadrao !== undefined ? supplier.percentualNotaPadrao : 100),
    tipoFrete: parsed.header.tipoFrete || 'Retira',
    valorFrete: 0,
    valorFreteGlobal: 0,
    valorOutrasDespesasGlobal: 0,
    descontoComercialTotal: parsed.header.percentualDescontoOff || 0,
    descontoComercialTipo: '%' as const,
    // Descrição do Pedido: exclusiva do pedido/planilha, independente do fornecedor
    observacoes: parsed.header.observacoes || '',
    observacoesDescarga: parsed.header.observacoes || '',
    // STATUS CRÍTICO: Sempre importado como ativo/rascunho editável ("Em Cotação"), NUNCA fechado.
    status: 'Em Cotação' as const,
    isDraft: true,
    separationStatus: 'Pendente' as const,
    totalLiquido,
    totalPecas,
    aliquotaSt,
    aliquotaIpi,
    aliquotaFrete: 0,
    aliquotaIcmsEntrada,
    aliquotaCustoFixo,
    aliquotaIcmsSaida,
    aliquotaPisCofinsIr,
    createdAt: now,
    updatedAt: now
  };

  const initialOrder: PurchaseOrder = {
    id: orderId,
    header,
    items: finalItemsWithTrailingBlank,
    fiscalConfig: currentFiscalConfig,
    storeConfigs,
    installments: []
  };

  // 4. Gerar parcelas financeiras
  try {
    const installments = generateOrderInstallments(initialOrder);
    initialOrder.installments = installments;
  } catch (err) {
    console.warn('Não foi possível autogerar parcelas na importação:', err);
    initialOrder.installments = [];
  }

  return initialOrder;
}
