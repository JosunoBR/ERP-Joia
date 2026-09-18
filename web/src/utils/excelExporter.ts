import ExcelJS from 'exceljs';
import { PurchaseOrder, StoreConfig, FiscalConfig } from '../shared/types';
import { formatPaymentConditionDisplay, cleanPaymentFormDisplay, resolveOrderPaymentCondition } from './pdfExporter';

function formatCurrency(val: number): string {
  return `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function exportOrderToExcel(order: PurchaseOrder, _fallbackStores?: StoreConfig[], _fallbackFiscal?: FiscalConfig): Promise<boolean> {
  const rawNum = order.header?.numeroPedido || 'PED-0001';
  const numeroPedido = String(rawNum).replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Proposta_Comercial_${numeroPedido}_${cleanFornecedor}.xlsx`;

  const status = order.header?.status || 'Aprovado';
  const dataEmissao = order.header?.dataEmissao || new Date().toLocaleDateString('pt-BR');
  const dataEntrega = order.header?.dataEntregaPrevista || 'A Combinar';
  const fornecedorNome = (order.header?.fornecedor || 'FORNECEDOR NÃO INFORMADO').toUpperCase();
  const vendedor = order.header?.vendedor || 'N/A';
  const contatoVendedor = order.header?.contatoVendedor || 'S/ Contato';
  const { condicaoPagamento, formaPagamento } = resolveOrderPaymentCondition(order);
  const tipoFrete = order.header?.tipoFrete || 'CIF (Por conta do Fornecedor)';
  const percentualOff = Number(order.header?.percentualDescontoOff || 0);
  const observacoes = order.header?.observacoes || order.header?.observacoesDescarga || '';

  // Filtra itens com dados válidos
  const filteredItems = (order.items || []).filter(it =>
    Boolean(it.descricao?.trim() || it.codigo?.trim() || it.codigoInterno?.trim() || it.codigoFornecedor?.trim() || it.qtdTotalUnidades > 0 || it.precoUnitario > 0)
  );

  let totalVolumesGeral = 0;
  let totalPecasGeral = 0;
  let subtotalGeral = 0;
  let totalIpiGeral = 0;
  let somaPrecoUnitario = 0;

  const itemRowsData = filteredItems.map((item, idx) => {
    const refFornec = item.codigoFornecedor || (item as any).referencia || item.codigo || '-';
    const pack = Number(item.qtdNoPacote) || Number(item.qtdPorPacote) || 1;
    const pacotes = Number(item.qtdPacotes) || 0;
    const pecas = Number(item.qtdTotalUnidades) || (pacotes * pack);
    const precoUnit = Number(item.precoUnitario) || 0;
    const valorTotal = Number(item.valorTotalLiquido) || Number(item.valorTotalBruto) || (pecas * precoUnit);

    const ipiAliq = item.aliquotaIpi !== undefined && item.aliquotaIpi !== null
      ? Number(item.aliquotaIpi)
      : (item.fiscalOverride?.ipiAliquota !== undefined && item.fiscalOverride?.ipiAliquota !== null
          ? Number(item.fiscalOverride.ipiAliquota)
          : (order.header?.aliquotaIpi !== undefined && order.header?.aliquotaIpi !== null
              ? Number(order.header.aliquotaIpi)
              : (order.fiscalConfig?.ipiAliquota !== undefined && order.fiscalConfig?.ipiAliquota !== null
                  ? Number(order.fiscalConfig.ipiAliquota)
                  : 0)));

    const valorIpi = item.valorIpi !== undefined && item.valorIpi !== null && Number(item.valorIpi) > 0
      ? Number(item.valorIpi)
      : (item.ipiUnitario !== undefined && item.ipiUnitario !== null && Number(item.ipiUnitario) > 0
          ? Number(item.ipiUnitario) * pecas
          : (valorTotal * (ipiAliq / 100)));

    totalVolumesGeral += pacotes;
    totalPecasGeral += pecas;
    subtotalGeral += valorTotal;
    totalIpiGeral += valorIpi;
    somaPrecoUnitario += precoUnit;

    const ipiDisplay = valorIpi > 0
      ? (ipiAliq > 0 ? `${formatCurrency(valorIpi)} (${ipiAliq}%)` : formatCurrency(valorIpi))
      : (ipiAliq > 0 ? `${ipiAliq}%` : 'R$ 0,00');

    return {
      idx: idx + 1,
      refFornec,
      descricao: item.descricao || 'Produto sem descrição',
      pack,
      pacotes,
      pecas,
      precoUnit,
      ipiDisplay,
      valorTotal
    };
  });

  const precoMedioGeral = totalPecasGeral > 0
    ? (subtotalGeral / totalPecasGeral)
    : (filteredItems.length > 0 ? (somaPrecoUnitario / filteredItems.length) : 0);

  const totalGeralComIpi = subtotalGeral + totalIpiGeral;

  // Criação da Pasta de Trabalho com ExcelJS
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jóia ERP';
  workbook.created = new Date();
  const ws = workbook.addWorksheet('Proposta Comercial', {
    views: [{ showGridLines: true }]
  });

  // Configura larguras exatas das 9 colunas
  ws.columns = [
    { key: 'colA', width: 8 },   // #
    { key: 'colB', width: 20 },  // Ref. Fornecedor
    { key: 'colC', width: 56 },  // Descrição do Produto
    { key: 'colD', width: 11 },  // Qtd/Cx
    { key: 'colE', width: 13 },  // Qtd Cx
    { key: 'colF', width: 15 },  // Total Peças
    { key: 'colG', width: 17 },  // Preço Unit.
    { key: 'colH', width: 17 },  // IPI
    { key: 'colI', width: 20 },  // Valor Total
  ];

  // Helper para bordas
  const thinBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } }
  };

  const cardBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } }
  };

  // ===========================================================================
  // 1. CABEÇALHO OFICIAL (Identidade Jóia ERP e Badge do Pedido)
  // ===========================================================================
  ws.mergeCells('A1:F1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'PEDIDO DE COMPRA COMERCIAL';
  titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  ws.mergeCells('G1:I1');
  const badgeNumCell = ws.getCell('G1');
  badgeNumCell.value = `PEDIDO Nº ${rawNum}`;
  badgeNumCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  badgeNumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  badgeNumCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 22;

  ws.mergeCells('A2:F2');
  const subTitleCell = ws.getCell('A2');
  subTitleCell.value = 'EMPRESA COMPRADORA  •  AUTORIZAÇÃO OFICIAL DE FORNECIMENTO';
  subTitleCell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FF059669' } };
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  ws.mergeCells('G2:I2');
  const badgeDateCell = ws.getCell('G2');
  badgeDateCell.value = `Emissão: ${dataEmissao}  |  Status: ${status}`;
  badgeDateCell.font = { name: 'Segoe UI', size: 8, color: { argb: 'FFE2E8F0' } };
  badgeDateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  badgeDateCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 17;

  ws.mergeCells('G3:I3');
  const badgeDeliveryCell = ws.getCell('G3');
  badgeDeliveryCell.value = `Previsão de Entrega: ${dataEntrega}`;
  badgeDeliveryCell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FFFBBF24' } }; // Amber-400
  badgeDeliveryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  badgeDeliveryCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(3).height = 17;

  ws.getRow(4).height = 8; // Espaçador

  // ===========================================================================
  // 2. BANNER DE ATENÇÃO OBRIGATÓRIA (Amarelo / Âmbar como no PDF)
  // ===========================================================================
  ws.mergeCells('A5:I5');
  const warningCell = ws.getCell('A5');
  warningCell.value = '! ATENÇÃO OBRIGATÓRIA: AGENDAR ENTREGA COM ROBERTA: (42) 9 9136-5009 | DESCARREGAMENTO POR CONTA DO FORNECEDOR';
  warningCell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FF92400E' } };
  warningCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  for (let c = 1; c <= 9; c++) {
    const cell = ws.getRow(5).getCell(c);
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFF59E0B' } },
      bottom: { style: 'thin', color: { argb: 'FFF59E0B' } },
      left: { style: 'thin', color: { argb: 'FFF59E0B' } },
      right: { style: 'thin', color: { argb: 'FFF59E0B' } }
    };
  }
  warningCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(5).height = 22;

  ws.getRow(6).height = 8; // Espaçador

  // ===========================================================================
  // 3. CARDS SUPERIORES: EMPRESA COMPRADORA (A:D) & FORNECEDOR / COMERCIAL (E:I)
  // ===========================================================================
  // Cabeçalhos dos Cards
  ws.mergeCells('A7:D7');
  const card1Header = ws.getCell('A7');
  card1Header.value = 'DADOS DA EMPRESA COMPRADORA & FATURAMENTO:';
  card1Header.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF1E293B' } };
  card1Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  card1Header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  ws.mergeCells('E7:I7');
  const card2Header = ws.getCell('E7');
  card2Header.value = 'DADOS DO FORNECEDOR & CONDIÇÕES COMERCIAIS:';
  card2Header.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF1E293B' } };
  card2Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  card2Header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  for (let col = 1; col <= 9; col++) {
    ws.getRow(7).getCell(col).border = cardBorder;
  }
  ws.getRow(7).height = 20;

  // Cálculo do Desconto Comercial
  let totalBrutoMercadorias = 0;
  let totalDescontoItens = 0;
  filteredItems.forEach(item => {
    const pack = Number(item.qtdNoPacote) || Number(item.qtdPorPacote) || 1;
    const pacotes = Number(item.qtdPacotes) || 0;
    const pecas = Number(item.qtdTotalUnidades) || (pacotes * pack);
    const precoUnit = Number(item.precoUnitario) || 0;
    const valorBruto = Number(item.valorTotalBruto) || (pecas * precoUnit);
    const valorLiquido = Number(item.valorTotalLiquido) || valorBruto;
    totalBrutoMercadorias += valorBruto;
    if (item.valorDescontoItem !== undefined && Number(item.valorDescontoItem) > 0) {
      totalDescontoItens += Number(item.valorDescontoItem);
    } else if (valorBruto > valorLiquido) {
      totalDescontoItens += (valorBruto - valorLiquido);
    }
  });

  let descontoComercialPercent = 0;
  if (order.header?.descontoComercialTotal !== undefined && Number(order.header.descontoComercialTotal) > 0) {
    if (order.header.descontoComercialTipo === '%') {
      descontoComercialPercent = Number(order.header.descontoComercialTotal);
    } else {
      descontoComercialPercent = totalBrutoMercadorias > 0
        ? (Number(order.header.descontoComercialTotal) / totalBrutoMercadorias) * 100
        : 0;
    }
  } else if (totalDescontoItens > 0 && totalBrutoMercadorias > 0) {
    descontoComercialPercent = (totalDescontoItens / totalBrutoMercadorias) * 100;
  } else if (percentualOff > 0) {
    descontoComercialPercent = percentualOff;
  }

  const descontoComercialTexto = `${Number(descontoComercialPercent.toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;

  // Linhas de dados dos dois cards
  const cardRows = [
    {
      c1Label: 'Razão Social:', c1Val: 'EMPRESA COMPRADORA', c1Bold: true,
      c2Label: 'Fornecedor:', c2Val: fornecedorNome, c2Bold: true
    },
    {
      c1Label: 'CNPJ / IE:', c1Val: '37.144.240/0001-70       IE: 90847822-35', c1Bold: false,
      c2Label: 'Vendedor / Contato:', c2Val: `${vendedor}  |  ${contatoVendedor}`, c2Bold: false
    },
    {
      c1Label: 'End. Entrega:', c1Val: 'Av. José Galiciolli, 152 – BR153 – Centro – Irati – PR (CEP: 84500-009)', c1Bold: true,
      c2Label: '% OFF (Desconto):', c2Val: `${percentualOff}% OFF`, c2Bold: true, c2Color: 'FF059669'
    },
    {
      c1Label: 'E-mail Boletos / XML:', c1Val: 'als.conecta@gmail.com', c1Bold: true, c1Color: 'FF059669',
      c2Label: 'Desconto Comercial:', c2Val: descontoComercialTexto, c2Bold: true, c2Color: 'FF059669'
    },
    {
      c1Label: 'Compras / Faturamento:', c1Val: '(55) 9 9659-6315 (Rafael)  |  (55) 9 99691-0247 (Ketlyn)', c1Bold: false,
      c2Label: 'Condição de Pagto:', c2Val: condicaoPagamento, c2Bold: true
    },
    {
      c1Label: 'Financeiro:', c1Val: '(55) 9 3618-5609 (Bruna)', c1Bold: false,
      c2Label: 'Forma de Pagto:', c2Val: formaPagamento, c2Bold: false
    },
    {
      c1Label: '', c1Val: '', c1Bold: false,
      c2Label: 'Tipo de Frete:', c2Val: tipoFrete, c2Bold: false
    },
  ];

  cardRows.forEach((cr, index) => {
    const rowNum = 8 + index;
    const row = ws.getRow(rowNum);
    row.height = 18;

    // Card 1
    row.getCell(1).value = cr.c1Label;
    row.getCell(1).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF475569' } };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    ws.mergeCells(`B${rowNum}:D${rowNum}`);
    const c1ValCell = row.getCell(2);
    c1ValCell.value = cr.c1Val;
    c1ValCell.font = { name: 'Segoe UI', size: 8, bold: cr.c1Bold, color: { argb: cr.c1Color || 'FF1E293B' } };
    c1ValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    c1ValCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // Card 2
    row.getCell(5).value = cr.c2Label;
    row.getCell(5).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF475569' } };
    row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    ws.mergeCells(`F${rowNum}:I${rowNum}`);
    const c2ValCell = row.getCell(6);
    c2ValCell.value = cr.c2Val;
    c2ValCell.font = { name: 'Segoe UI', size: 8, bold: cr.c2Bold, color: { argb: cr.c2Color || 'FF1E293B' } };
    c2ValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    c2ValCell.alignment = { vertical: 'middle', horizontal: 'left' };

    for (let c = 1; c <= 9; c++) {
      row.getCell(c).border = thinBorder;
    }
  });

  let currentRow = 8 + cardRows.length;

  if (observacoes && observacoes.trim()) {
    const obsRowNum = currentRow;
    const obsRow = ws.getRow(obsRowNum);
    obsRow.height = 24;
    ws.mergeCells(`A${obsRowNum}:I${obsRowNum}`);
    const obsCell = obsRow.getCell(1);
    obsCell.value = `📌 DESCRIÇÃO / OBSERVAÇÕES DO PEDIDO: ${observacoes.trim()}`;
    obsCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF92400E' } }; // Amber-800
    obsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }; // Amber-100
    obsCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= 9; c++) {
      obsRow.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFD97706' } },
        bottom: { style: 'thin', color: { argb: 'FFD97706' } },
        left: { style: 'thin', color: { argb: 'FFD97706' } },
        right: { style: 'thin', color: { argb: 'FFD97706' } }
      };
    }
    currentRow++;
  }

  const spacerRowNum = currentRow;
  ws.getRow(spacerRowNum).height = 10; // Espaçador

  // ===========================================================================
  // 4. TABELA DE ITENS (9 Colunas com Cabeçalho Escuro #0F172A)
  // ===========================================================================
  const headers = [
    '#',
    'Ref. Fornecedor',
    'Descrição do Produto',
    'Qtd/Cx',
    'Qtd Cx',
    'Total Peças',
    'Preço Unit.',
    'IPI',
    'Valor Total'
  ];

  const tableHeaderRowNum = spacerRowNum + 1;
  const tableHeaderRow = ws.getRow(tableHeaderRowNum);
  tableHeaderRow.height = 24;
  headers.forEach((h, idx) => {
    const cell = tableHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'thin', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx === 2 ? 'left' : (idx >= 6 ? 'right' : 'center'),
      indent: idx === 2 ? 1 : 0
    };
  });

  // Linhas de Produtos com Cores Alternadas e Formatação
  let currentRowNum = tableHeaderRowNum + 1;
  itemRowsData.forEach((it, idx) => {
    const row = ws.getRow(currentRowNum);
    row.height = 20;
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    const cellsData = [
      { val: it.idx, align: 'center', bold: false, color: 'FF475569' },
      { val: it.refFornec, align: 'center', bold: true, color: 'FF0F172A' },
      { val: it.descricao, align: 'left', bold: true, color: 'FF1E293B', indent: 1 },
      { val: it.pack, align: 'center', bold: false, color: 'FF475569' },
      { val: it.pacotes, align: 'center', bold: true, color: 'FF1E293B' },
      { val: `${it.pecas.toLocaleString('pt-BR')} un`, align: 'center', bold: true, color: 'FF059669' }, // Verde destacado
      { val: formatCurrency(it.precoUnit), align: 'right', bold: false, color: 'FF1E293B' },
      { val: it.ipiDisplay, align: 'right', bold: true, color: 'FFB45309' }, // Âmbar
      { val: formatCurrency(it.valorTotal), align: 'right', bold: true, color: 'FF0F172A' },
    ];

    cellsData.forEach((cData, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = cData.val;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.font = { name: 'Segoe UI', size: 8.5, bold: cData.bold, color: { argb: cData.color } };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: 'middle',
        horizontal: cData.align as any,
        indent: cData.indent || 0
      };
    });

    currentRowNum++;
  });

  // ===========================================================================
  // 5. LINHA DE TOTAIS DA TABELA (Barra Verde #D1FAE5 idêntica ao PDF)
  // ===========================================================================
  ws.mergeCells(`A${currentRowNum}:D${currentRowNum}`);
  const totalLabelCell = ws.getCell(`A${currentRowNum}`);
  totalLabelCell.value = `TOTAIS DO PEDIDO (${filteredItems.length} itens)`;
  totalLabelCell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FF064E3B' } };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const footerRow = ws.getRow(currentRowNum);
  footerRow.height = 22;

  footerRow.getCell(5).value = `${totalVolumesGeral.toLocaleString('pt-BR')} cx`;
  footerRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

  footerRow.getCell(6).value = `${totalPecasGeral.toLocaleString('pt-BR')} un`;
  footerRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

  footerRow.getCell(7).value = formatCurrency(precoMedioGeral);
  footerRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };

  footerRow.getCell(8).value = formatCurrency(totalIpiGeral);
  footerRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };

  footerRow.getCell(9).value = formatCurrency(subtotalGeral);
  footerRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };

  for (let c = 1; c <= 9; c++) {
    const cell = footerRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Emerald-100
    cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FF064E3B' } }; // Emerald-900
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFA7F3D0' } },
      bottom: { style: 'thin', color: { argb: 'FFA7F3D0' } },
      left: { style: 'thin', color: { argb: 'FFA7F3D0' } },
      right: { style: 'thin', color: { argb: 'FFA7F3D0' } }
    };
  }

  currentRowNum++;
  ws.getRow(currentRowNum).height = 10; // Espaçador
  currentRowNum++;

  // ===========================================================================
  // 6. BLOCO INFERIOR: REGRAS OPERACIONAIS (A:E) & RESUMO TOTAL GERAL (G:I)
  // ===========================================================================
  const blockStartRow = currentRowNum;

  // Header Regras (Esquerda: A:E)
  ws.mergeCells(`A${blockStartRow}:E${blockStartRow}`);
  const rulesHeader = ws.getCell(`A${blockStartRow}`);
  rulesHeader.value = 'REGRAS MANDATÓRIAS DE RECEBIMENTO & FATURAMENTO (Jóia ERP / ALS 10):';
  rulesHeader.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF991B1B' } };
  rulesHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
  rulesHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(blockStartRow).height = 18;

  // Header Total Geral (Direita: G:I) - Card Verde Emerald
  ws.mergeCells(`G${blockStartRow}:I${blockStartRow}`);
  const totalCardHeader = ws.getCell(`G${blockStartRow}`);
  totalCardHeader.value = `TOTAL GERAL DO PEDIDO (${filteredItems.length} ITENS | ${totalVolumesGeral.toLocaleString('pt-BR')} CX | ${totalPecasGeral.toLocaleString('pt-BR')} UN):`;
  totalCardHeader.font = { name: 'Segoe UI', size: 7.5, color: { argb: 'FFFFFFFF' } };
  totalCardHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
  totalCardHeader.alignment = { vertical: 'middle', horizontal: 'center' };

  for (let c = 1; c <= 5; c++) {
    ws.getRow(blockStartRow).getCell(c).border = {
      top: { style: 'thin', color: { argb: 'FFEF4444' } },
      left: { style: 'thin', color: { argb: 'FFEF4444' } },
      right: { style: 'thin', color: { argb: 'FFEF4444' } },
      bottom: { style: 'thin', color: { argb: 'FFFCA5A5' } }
    };
  }
  for (let c = 7; c <= 9; c++) {
    ws.getRow(blockStartRow).getCell(c).border = {
      top: { style: 'thin', color: { argb: 'FF047857' } },
      left: { style: 'thin', color: { argb: 'FF047857' } },
      right: { style: 'thin', color: { argb: 'FF047857' } }
    };
  }

  // Linhas das Regras
  const rulesList = [
    '1. Boletos NÃO devem exceder o valor de R$ 9.999,00 por título.',
    '2. Boletos e arquivo XML da Nota Fiscal devem ser enviados para: als.conecta@gmail.com.',
    '3. Pagamento de Parte Especial exclusivamente via depósitos bancários autorizados.',
    '4. Os pedidos seguem espelho oficial da empresa. Favor conferir e avisar imediatamente se houver desacordo.',
    '5. Descarregamento no local de entrega sob responsabilidade do fornecedor / transportadora.',
    observacoes ? `📌 OBSERVAÇÃO DO PEDIDO: ${observacoes}` : 'Obs: Descarregamento e entrega sob responsabilidade do fornecedor.'
  ];

  rulesList.forEach((rule, rIdx) => {
    const rNum = blockStartRow + 1 + rIdx;
    ws.mergeCells(`A${rNum}:E${rNum}`);
    const rCell = ws.getCell(`A${rNum}`);
    rCell.value = rule;
    const isObsRow = rIdx === 5;
    rCell.font = { 
      name: 'Segoe UI', 
      size: isObsRow && observacoes ? 8 : 7.5, 
      bold: Boolean(isObsRow && observacoes), 
      italic: Boolean(isObsRow && !observacoes), 
      color: { argb: isObsRow && observacoes ? 'FF92400E' : isObsRow ? 'FF475569' : 'FF1E293B' } 
    };
    rCell.fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: isObsRow && observacoes ? 'FFFEF3C7' : 'FFFEF2F2' } 
    };
    rCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(rNum).height = 16;

    for (let c = 1; c <= 5; c++) {
      ws.getRow(rNum).getCell(c).border = {
        left: { style: 'thin', color: { argb: isObsRow && observacoes ? 'FFD97706' : 'FFEF4444' } },
        right: { style: 'thin', color: { argb: isObsRow && observacoes ? 'FFD97706' : 'FFEF4444' } },
        bottom: rIdx === 5 ? { style: 'thin', color: { argb: isObsRow && observacoes ? 'FFD97706' : 'FFEF4444' } } : undefined
      };
    }
  });

  // Linha 2 do Card de Total Geral (Valor Gigante em Destaque)
  const valRow = blockStartRow + 1;
  ws.mergeCells(`G${valRow}:I${valRow + 1}`);
  const totalValCell = ws.getCell(`G${valRow}`);
  totalValCell.value = formatCurrency(totalGeralComIpi);
  totalValCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  totalValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
  totalValCell.alignment = { vertical: 'middle', horizontal: 'center' };

  for (let r = valRow; r <= valRow + 1; r++) {
    ws.getRow(r).height = 20;
    for (let c = 7; c <= 9; c++) {
      ws.getRow(r).getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      ws.getRow(r).getCell(c).border = {
        left: { style: 'thin', color: { argb: 'FF047857' } },
        right: { style: 'thin', color: { argb: 'FF047857' } },
        bottom: r === valRow + 1 ? { style: 'thin', color: { argb: 'FF047857' } } : undefined
      };
    }
  }

  // Linha de Detalhamento Financeiro (Líquido + IPI)
  const detRow = valRow + 2;
  ws.mergeCells(`G${detRow}:I${detRow}`);
  const detCell = ws.getCell(`G${detRow}`);
  detCell.value = `(Líquido: ${formatCurrency(subtotalGeral)} + IPI: ${formatCurrency(totalIpiGeral)})`;
  detCell.font = { name: 'Segoe UI', size: 8, color: { argb: 'FF475569' } };
  detCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(detRow).height = 16;

  // ===========================================================================
  // 7. ASSINATURAS (Comprador e Fornecedor)
  // ===========================================================================
  const sigLineRow = blockStartRow + 8;
  ws.getRow(sigLineRow).height = 20;
  ws.mergeCells(`A${sigLineRow}:D${sigLineRow}`);
  const sig1Line = ws.getCell(`A${sigLineRow}`);
  sig1Line.value = '__________________________________________';
  sig1Line.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF94A3B8' } };
  sig1Line.alignment = { vertical: 'bottom', horizontal: 'center' };

  ws.mergeCells(`G${sigLineRow}:I${sigLineRow}`);
  const sig2Line = ws.getCell(`G${sigLineRow}`);
  sig2Line.value = '__________________________________________';
  sig2Line.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF94A3B8' } };
  sig2Line.alignment = { vertical: 'bottom', horizontal: 'center' };

  const sigLabelRow = sigLineRow + 1;
  ws.getRow(sigLabelRow).height = 18;
  ws.mergeCells(`A${sigLabelRow}:D${sigLabelRow}`);
  const sig1Label = ws.getCell(`A${sigLabelRow}`);
  sig1Label.value = 'COMPRADOR RESPONSÁVEL';
  sig1Label.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF475569' } };
  sig1Label.alignment = { vertical: 'top', horizontal: 'center' };

  ws.mergeCells(`G${sigLabelRow}:I${sigLabelRow}`);
  const sig2Label = ws.getCell(`G${sigLabelRow}`);
  sig2Label.value = 'ACEITE DO FORNECEDOR';
  sig2Label.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF475569' } };
  sig2Label.alignment = { vertical: 'top', horizontal: 'center' };

  // ===========================================================================
  // 8. DOWNLOAD DO ARQUIVO XLSX NO NAVEGADOR
  // ===========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 500);

  return true;
}

