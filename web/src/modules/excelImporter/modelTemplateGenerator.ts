import ExcelJS from 'exceljs';
import { DEFAULT_STORES } from '../../shared/constants';

/**
 * Paleta Visual Oficial da Rede Mega 12
 */
const COLORS = {
  darkNavy: 'FF0F172A',     // #0F172A
  darkSlate: 'FF1E293B',    // #1E293B
  mediumSlate: 'FF334155',  // #334155
  mutedSlate: 'FF475569',   // #475569
  lightSlate: 'FF94A3B8',   // #94A3B8
  borderSlate: 'FFE2E8F0',  // #E2E8F0
  surfaceBg: 'FFF8FAFC',    // #F8FAFC
  white: 'FFFFFFFF',

  primaryGreen: 'FF059669', // #059669 (Emerald 600)
  accentGreen: 'FF10B981',  // #10B981 (Emerald 500)
  darkGreen: 'FF064E3B',    // #064E3B (Emerald 900)
  lightGreenBg: 'FFD1FAE5', // #D1FAE5 (Emerald 100)
  inputGreenBg: 'FFECFDF5', // #ECFDF5 (Emerald 50)

  amberBg: 'FFFEF3C7',      // #FEF3C7
  amberText: 'FF92400E',    // #92400E
  amberBorder: 'FFF59E0B',  // #F59E0B

  roseBg: 'FFFEF2F2',       // #FEF2F2
  roseText: 'FF991B1B',     // #991B1B
  roseBorder: 'FFEF4444'    // #EF4444
};

const thinBorder = {
  top: { style: 'thin' as const, color: { argb: COLORS.borderSlate } },
  bottom: { style: 'thin' as const, color: { argb: COLORS.borderSlate } },
  left: { style: 'thin' as const, color: { argb: COLORS.borderSlate } },
  right: { style: 'thin' as const, color: { argb: COLORS.borderSlate } }
};

/**
 * Cria dinamicamente a pasta de trabalho Excel oficial da Rede Mega 12.
 */
export async function buildModelWorkbook(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rede Mega 12 - Sistema de Compras';
  workbook.lastModifiedBy = 'Rede Mega 12';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ===========================================================================
  // ABA 1: PEDIDO COMERCIAL (8 Colunas Essenciais)
  // ===========================================================================
  const ws1 = workbook.addWorksheet('PEDIDO COMERCIAL', {
    views: [{ showGridLines: true }]
  });

  ws1.columns = [
    { key: 'colA', width: 6 },   // #
    { key: 'colB', width: 20 },  // CÓDIGO FORNECEDOR
    { key: 'colC', width: 46 },  // DESCRIÇÃO DO PRODUTO
    { key: 'colD', width: 10 },  // UNID.
    { key: 'colE', width: 12 },  // QTD/CX
    { key: 'colF', width: 12 },  // QTD CX
    { key: 'colG', width: 15 },  // TOTAL PEÇAS
    { key: 'colH', width: 18 },  // PREÇO UNIT. (R$)
  ];

  // 1. Cabeçalho Oficial Corporativo
  ws1.mergeCells('A1:F1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = 'REDE MEGA 12 • PLANILHA MODELO DE IMPORTAÇÃO DE PEDIDOS';
  titleCell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkNavy } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  ws1.mergeCells('G1:H1');
  const badgeNumCell = ws1.getCell('G1');
  badgeNumCell.value = 'MODELO OFICIAL V2.0';
  badgeNumCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: COLORS.white } };
  badgeNumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryGreen } };
  badgeNumCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(1).height = 24;

  ws1.mergeCells('A2:F2');
  const subTitleCell = ws1.getCell('A2');
  subTitleCell.value = 'ALS 10 BAZAR E BRINQUEDOS LTDA  •  ESTRUTURA INTELIGENTE ANTI-ERRO';
  subTitleCell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FF6EE7B7' } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkSlate } };
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  ws1.mergeCells('G2:H2');
  const badgeDateCell = ws1.getCell('G2');
  badgeDateCell.value = 'Uso: Compras e Fornecedores';
  badgeDateCell.font = { name: 'Segoe UI', size: 8, color: { argb: 'FFE2E8F0' } };
  badgeDateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkSlate } };
  badgeDateCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(2).height = 18;

  // Banner Informativo
  ws1.mergeCells('A3:H3');
  const warningCell = ws1.getCell('A3');
  warningCell.value = 'ℹ️ INSTRUÇÕES: Preencha os Dados do Fornecedor, Condições e Produtos. A coluna TOTAL PEÇAS calcula automaticamente (= QTD/CX × QTD CX).';
  warningCell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.amberText } };
  warningCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amberBg } };
  for (let c = 1; c <= 8; c++) {
    ws1.getRow(3).getCell(c).border = {
      top: { style: 'thin', color: { argb: COLORS.amberBorder } },
      bottom: { style: 'thin', color: { argb: COLORS.amberBorder } },
      left: { style: 'thin', color: { argb: COLORS.amberBorder } },
      right: { style: 'thin', color: { argb: COLORS.amberBorder } }
    };
  }
  warningCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(3).height = 20;

  ws1.getRow(4).height = 6;

  // Cards de Cabeçalho: Comprador (A..D) e Fornecedor (E..H)
  ws1.mergeCells('A5:D5');
  const card1Header = ws1.getCell('A5');
  card1Header.value = '1. DADOS DA EMPRESA COMPRADORA (DESTINATÁRIO - MEGA 12):';
  card1Header.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.white } };
  card1Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkSlate } };
  card1Header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  ws1.mergeCells('E5:H5');
  const card2Header = ws1.getCell('E5');
  card2Header.value = '2. DADOS DO FORNECEDOR & VENDEDOR (PREENCHA SEUS DADOS):';
  card2Header.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.white } };
  card2Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkSlate } };
  card2Header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(5).height = 20;

  const headerDetails = [
    {
      c1Label: 'Razão Social:', c1Val: 'ALS 10 BAZAR E BRINQUEDOS LTDA', c1Bold: true,
      c2Label: 'Razão Social:', c2Val: ''
    },
    {
      c1Label: 'CNPJ / IE:', c1Val: '37.144.240/0001-70    IE: 90847822-35', c1Bold: false,
      c2Label: 'CNPJ:', c2Val: ''
    },
    {
      c1Label: 'End. Entrega:', c1Val: 'Av. José Galiciolli, 152 – BR153 – Centro – Irati – PR (CEP: 84500-009)', c1Bold: true,
      c2Label: 'Vendedor:', c2Val: ''
    },
    {
      c1Label: 'Boletos / XML:', c1Val: 'als.conecta@gmail.com', c1Bold: true,
      c2Label: 'WhatsApp / Fone:', c2Val: ''
    },
    {
      c1Label: 'Compras:', c1Val: 'Rafael (55) 9 9659-6315  |  Bruna (55) 9 3618-5609', c1Bold: false,
      c2Label: 'E-mail Vendas:', c2Val: ''
    }
  ];

  headerDetails.forEach((hd, index) => {
    const rowNum = 6 + index;
    const row = ws1.getRow(rowNum);
    row.height = 19;

    row.getCell(1).value = hd.c1Label;
    row.getCell(1).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.mutedSlate } };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.surfaceBg } };
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    ws1.mergeCells(`B${rowNum}:D${rowNum}`);
    const c1Cell = row.getCell(2);
    c1Cell.value = hd.c1Val;
    c1Cell.font = { name: 'Segoe UI', size: 8, bold: hd.c1Bold, color: { argb: COLORS.darkSlate } };
    c1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.surfaceBg } };
    c1Cell.alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(5).value = hd.c2Label;
    row.getCell(5).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.mutedSlate } };
    row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.inputGreenBg } };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    ws1.mergeCells(`F${rowNum}:H${rowNum}`);
    const c2Cell = row.getCell(6);
    c2Cell.value = hd.c2Val;
    c2Cell.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.darkNavy } };
    c2Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } };
    c2Cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    for (let c = 1; c <= 8; c++) {
      row.getCell(c).border = thinBorder;
    }
  });

  ws1.getRow(11).height = 6;

  // Card 3: Condições Comerciais e Logísticas
  ws1.mergeCells('A12:H12');
  const card3Header = ws1.getCell('A12');
  card3Header.value = '3. CONDIÇÕES COMERCIAIS, PRAZOS & FRETE:';
  card3Header.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.white } };
  card3Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryGreen } };
  card3Header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(12).height = 19;

  const row13 = ws1.getRow(13);
  row13.height = 19;

  row13.getCell(1).value = 'Nº Pedido:';
  row13.getCell(1).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.mutedSlate } };
  row13.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.surfaceBg } };

  row13.getCell(2).value = '';
  row13.getCell(2).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.darkNavy } };
  row13.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

  row13.getCell(3).value = 'Data Pedido:';
  row13.getCell(3).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.mutedSlate } };
  row13.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.surfaceBg } };

  row13.getCell(4).value = '14/09/2026';
  row13.getCell(4).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.darkNavy } };
  row13.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

  row13.getCell(5).value = 'Entrega:';
  row13.getCell(5).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.mutedSlate } };
  row13.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.surfaceBg } };

  row13.getCell(6).value = '30/09/2026';
  row13.getCell(6).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.darkNavy } };
  row13.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

  row13.getCell(7).value = 'Tipo Frete:';
  row13.getCell(7).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.mutedSlate } };
  row13.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.surfaceBg } };

  row13.getCell(8).value = 'CIF';
  row13.getCell(8).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.primaryGreen } };
  row13.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };

  for (let c = 1; c <= 8; c++) {
    row13.getCell(c).border = thinBorder;
  }

  const row14 = ws1.getRow(14);
  row14.height = 19;

  row14.getCell(1).value = 'Cond. Pag.:';
  row14.getCell(1).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.mutedSlate } };
  row14.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.surfaceBg } };

  row14.getCell(2).value = '30/60/90 Dias';
  row14.getCell(2).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.darkNavy } };
  row14.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

  row14.getCell(3).value = '% OFF:';
  row14.getCell(3).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.mutedSlate } };
  row14.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.surfaceBg } };

  row14.getCell(4).value = '0%';
  row14.getCell(4).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.primaryGreen } };
  row14.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

  row14.getCell(5).value = 'Observações:';
  row14.getCell(5).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.mutedSlate } };
  row14.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.surfaceBg } };

  ws1.mergeCells('F14:H14');
  row14.getCell(6).value = 'Agendar descarregamento no CD Irati - Paletizado padrão PBR.';
  row14.getCell(6).font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: COLORS.darkSlate } };
  row14.getCell(6).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  for (let c = 1; c <= 8; c++) {
    row14.getCell(c).border = thinBorder;
  }

  ws1.getRow(15).height = 10;

  // ===========================================================================
  // TABELA DE ITENS (Linha 16 - 8 Colunas Essenciais)
  // ===========================================================================
  const tableHeaders = [
    { title: '#', align: 'center' as const },
    { title: 'CÓDIGO FORNECEDOR', align: 'center' as const },
    { title: 'DESCRIÇÃO DO PRODUTO', align: 'left' as const },
    { title: 'UNID.', align: 'center' as const },
    { title: 'QTD/CX', align: 'center' as const },
    { title: 'QTD CX', align: 'center' as const },
    { title: 'TOTAL PEÇAS', align: 'center' as const },
    { title: 'PREÇO UNIT. (R$)', align: 'right' as const },
  ];

  const headerRow = ws1.getRow(16);
  headerRow.height = 25;
  tableHeaders.forEach((th, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = th.title;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkNavy } };
    cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.white } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: th.align,
      indent: th.align === 'left' ? 1 : 0
    };
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.mediumSlate } },
      bottom: { style: 'thin', color: { argb: COLORS.mediumSlate } },
      left: { style: 'thin', color: { argb: COLORS.mediumSlate } },
      right: { style: 'thin', color: { argb: COLORS.mediumSlate } }
    };
  });

  // Grade de Produtos Pré-formatada e Limpa para Preenchimento (Linhas 17 a 46 - 30 itens)
  const totalTemplateRows = 30;
  let currentLine = 17;

  for (let r = 0; r < totalTemplateRows; r++) {
    const row = ws1.getRow(currentLine);
    row.height = 20;
    const isEven = r % 2 === 0;
    const rowBg = isEven ? COLORS.white : COLORS.surfaceBg;

    // Col 1: # (Sequencial)
    row.getCell(1).value = r + 1;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(1).font = { name: 'Segoe UI', size: 8.5, color: { argb: COLORS.mutedSlate } };

    // Col 2: Código Fornecedor
    row.getCell(2).value = '';
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.darkNavy } };

    // Col 3: Descrição do Produto
    row.getCell(3).value = '';
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    row.getCell(3).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.darkSlate } };

    // Col 4: UNID.
    row.getCell(4).value = '';
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).font = { name: 'Segoe UI', size: 8.5, color: { argb: COLORS.darkSlate } };

    // Col 5: QTD/CX
    row.getCell(5).value = '';
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).font = { name: 'Segoe UI', size: 8.5, color: { argb: COLORS.darkSlate } };

    // Col 6: QTD CX
    row.getCell(6).value = '';
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.darkNavy } };

    // Col 7: TOTAL PEÇAS (= QTD/CX * QTD CX)
    const pecasFormula = `IF(F${currentLine}>0,IF(E${currentLine}>0,E${currentLine}*F${currentLine},F${currentLine}),"")`;
    row.getCell(7).value = { formula: pecasFormula, result: '' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(7).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.primaryGreen } };

    // Col 8: PREÇO UNIT. (R$)
    row.getCell(8).value = '';
    row.getCell(8).numFmt = 'R$ #,##0.00';
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(8).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.darkNavy } };

    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;
    }

    currentLine++;
  }

  const lastDataLine = currentLine - 1;

  // Linha de Totais
  const totalRow = ws1.getRow(currentLine);
  totalRow.height = 24;

  ws1.mergeCells(`A${currentLine}:E${currentLine}`);
  const totalLabel = totalRow.getCell(1);
  totalLabel.value = 'TOTAIS CONSOLIDADOS DO PEDIDO:';
  totalLabel.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.darkGreen } };
  totalLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  totalRow.getCell(6).value = { formula: `SUM(F17:F${lastDataLine})`, result: 0 };
  totalRow.getCell(6).numFmt = '#,##0';
  totalRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
  totalRow.getCell(6).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.darkGreen } };

  totalRow.getCell(7).value = { formula: `SUM(G17:G${lastDataLine})`, result: 0 };
  totalRow.getCell(7).numFmt = '#,##0';
  totalRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
  totalRow.getCell(7).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.darkGreen } };

  totalRow.getCell(8).value = '';

  for (let c = 1; c <= 8; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGreenBg } };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.primaryGreen } },
      bottom: { style: 'medium', color: { argb: COLORS.primaryGreen } },
      left: { style: 'thin', color: { argb: 'FFA7F3D0' } },
      right: { style: 'thin', color: { argb: 'FFA7F3D0' } }
    };
  }

  currentLine++;
  ws1.getRow(currentLine).height = 12;
  currentLine++;

  // Bloco de Regras Mandatórias de Recebimento
  const blockStart = currentLine;

  ws1.mergeCells(`A${blockStart}:H${blockStart}`);
  const rulesHeader = ws1.getCell(`A${blockStart}`);
  rulesHeader.value = 'REGRAS MANDATÓRIAS DE RECEBIMENTO & FATURAMENTO (REDE MEGA 12 - CD IRATI):';
  rulesHeader.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.roseText } };
  rulesHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.roseBg } };
  rulesHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(blockStart).height = 20;

  for (let c = 1; c <= 8; c++) {
    ws1.getRow(blockStart).getCell(c).border = {
      top: { style: 'thin', color: { argb: COLORS.roseBorder } },
      bottom: { style: 'thin', color: { argb: COLORS.roseBorder } },
      left: { style: 'thin', color: { argb: COLORS.roseBorder } },
      right: { style: 'thin', color: { argb: COLORS.roseBorder } }
    };
  }

  const rules = [
    '1. Boletos NÃO devem exceder o valor de R$ 9.999,00 por título.',
    '2. Boletos e arquivo XML da Nota Fiscal devem ser enviados obrigatoriamente para: als.conecta@gmail.com.',
    '3. Descarregamento no local de entrega sob responsabilidade integral do fornecedor / transportadora.',
    '4. Agendar previamente a data de descarregamento no WhatsApp da Logística: (42) 9 9136-5009 (Roberta).',
    '5. As quantidades recebidas serão conferidas por bipagem e inspeção de avarias; divergências serão debitadas do pagamento.'
  ];

  rules.forEach((rText, rIdx) => {
    const rLine = blockStart + 1 + rIdx;
    ws1.mergeCells(`A${rLine}:H${rLine}`);
    const cell = ws1.getCell(`A${rLine}`);
    cell.value = rText;
    cell.font = { name: 'Segoe UI', size: 8, color: { argb: COLORS.darkSlate } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.roseBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws1.getRow(rLine).height = 18;

    for (let c = 1; c <= 8; c++) {
      ws1.getRow(rLine).getCell(c).border = {
        left: { style: 'thin', color: { argb: COLORS.roseBorder } },
        right: { style: 'thin', color: { argb: COLORS.roseBorder } },
        bottom: rIdx === rules.length - 1 ? { style: 'thin', color: { argb: COLORS.roseBorder } } : undefined
      };
    }
  });

  // ===========================================================================
  // ABA 2: SEPARAÇÃO POR LOJA (27 Colunas)
  // ===========================================================================
  const ws2 = workbook.addWorksheet('SEPARACAO POR LOJA', {
    views: [{ showGridLines: true }]
  });

  const stores = DEFAULT_STORES;

  ws2.columns = [
    { key: 'sColA', width: 6 },   // #
    { key: 'sColB', width: 18 },  // CÓDIGO FORNEC.
    { key: 'sColC', width: 42 },  // DESCRIÇÃO DO PRODUTO
    { key: 'sColD', width: 14 },  // TOTAL PEDIDO
    { key: 'sColE', width: 12 },  // RESERVA CD
    ...stores.map(() => ({ width: 14 })),
    { width: 15 },                // TOTAL ALOCADO
    { width: 16 },                // CONFERÊNCIA
  ];

  ws2.mergeCells('A1:AA1');
  const sepTitle = ws2.getCell('A1');
  sepTitle.value = 'REDE MEGA 12 • GRADE DE SEPARAÇÃO E DISTRIBUIÇÃO DAS 20 LOJAS';
  sepTitle.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: COLORS.white } };
  sepTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkNavy } };
  sepTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws2.getRow(1).height = 24;

  ws2.mergeCells('A2:AA2');
  const sepSub = ws2.getCell('A2');
  sepSub.value = 'Distribuição por filial em Unidades (UN). As quantidades alocadas devem bater exatamente com o total comprado do item.';
  sepSub.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FFD1FAE5' } };
  sepSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkSlate } };
  sepSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws2.getRow(2).height = 18;

  ws2.mergeCells('A3:D3');
  ws2.getCell('A3').value = 'DADOS DO ITEM COMPRADO';
  ws2.getCell('A3').font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.white } };
  ws2.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkSlate } };
  ws2.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

  ws2.getCell('E3').value = 'CD';
  ws2.getCell('E3').font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.white } };
  ws2.getCell('E3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.mediumSlate } };
  ws2.getCell('E3').alignment = { vertical: 'middle', horizontal: 'center' };

  ws2.mergeCells('F3:M3');
  ws2.getCell('F3').value = 'CLUSTER A (8 LOJAS PRINCIPAIS - MAIOR VOLUME)';
  ws2.getCell('F3').font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.white } };
  ws2.getCell('F3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryGreen } };
  ws2.getCell('F3').alignment = { vertical: 'middle', horizontal: 'center' };

  ws2.mergeCells('N3:U3');
  ws2.getCell('N3').value = 'CLUSTER B (8 LOJAS MÉDIAS)';
  ws2.getCell('N3').font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.white } };
  ws2.getCell('N3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
  ws2.getCell('N3').alignment = { vertical: 'middle', horizontal: 'center' };

  ws2.mergeCells('V3:Y3');
  ws2.getCell('V3').value = 'CLUSTER C (4 LOJAS COMPACTAS)';
  ws2.getCell('V3').font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.white } };
  ws2.getCell('V3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
  ws2.getCell('V3').alignment = { vertical: 'middle', horizontal: 'center' };

  ws2.mergeCells('Z3:AA3');
  ws2.getCell('Z3').value = 'AUDITORIA DA GRADE';
  ws2.getCell('Z3').font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.white } };
  ws2.getCell('Z3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkSlate } };
  ws2.getCell('Z3').alignment = { vertical: 'middle', horizontal: 'center' };
  ws2.getRow(3).height = 18;

  const sepHeaders = [
    '#', 'CÓDIGO FORNEC.', 'DESCRIÇÃO DO PRODUTO', 'TOTAL PEDIDO', 'RESERVA CD',
    ...stores.map(s => s.name.toUpperCase()),
    'TOTAL ALOCADO', 'CONFERÊNCIA'
  ];

  const sepHeaderRow = ws2.getRow(4);
  sepHeaderRow.height = 24;
  sepHeaders.forEach((hTitle, idx) => {
    const cell = sepHeaderRow.getCell(idx + 1);
    cell.value = hTitle;
    cell.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkNavy } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.mediumSlate } },
      bottom: { style: 'thin', color: { argb: COLORS.mediumSlate } },
      left: { style: 'thin', color: { argb: COLORS.mediumSlate } },
      right: { style: 'thin', color: { argb: COLORS.mediumSlate } }
    };
  });

  // Linhas de dados de separação pré-configuradas e vinculadas à Aba 1 (30 linhas)
  for (let sIdx = 0; sIdx < totalTemplateRows; sIdx++) {
    const sLine = 5 + sIdx;
    const commercialRowIndex = 17 + sIdx;
    const row = ws2.getRow(sLine);
    row.height = 20;

    row.getCell(1).value = sIdx + 1;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(1).font = { name: 'Segoe UI', size: 8.5, color: { argb: COLORS.mutedSlate } };

    // Vinculado à coluna B do Pedido Comercial (Código Fornecedor)
    row.getCell(2).value = { formula: `IF('PEDIDO COMERCIAL'!B${commercialRowIndex}="","",'PEDIDO COMERCIAL'!B${commercialRowIndex})`, result: '' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).font = { name: 'Segoe UI', size: 8.5, bold: true };

    // Vinculado à coluna C (Descrição do Produto)
    row.getCell(3).value = { formula: `IF('PEDIDO COMERCIAL'!C${commercialRowIndex}="","",'PEDIDO COMERCIAL'!C${commercialRowIndex})`, result: '' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    row.getCell(3).font = { name: 'Segoe UI', size: 8.5, bold: true };

    // Vinculado à coluna G (Total Peças)
    row.getCell(4).value = { formula: `IF('PEDIDO COMERCIAL'!G${commercialRowIndex}="","",'PEDIDO COMERCIAL'!G${commercialRowIndex})`, result: '' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.primaryGreen } };

    // Coluna E: Reserva CD
    row.getCell(5).value = '';
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

    // Colunas F a Y: 20 Lojas
    for (let l = 0; l < 20; l++) {
      row.getCell(6 + l).value = '';
      row.getCell(6 + l).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Coluna Z (26): Total Alocado (E + F..Y)
    row.getCell(26).value = { formula: `IF(OR(D${sLine}="",COUNT(E${sLine}:Y${sLine})=0),"",SUM(E${sLine}:Y${sLine}))`, result: '' };
    row.getCell(26).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(26).font = { name: 'Segoe UI', size: 8.5, bold: true };

    // Coluna AA (27): Conferência
    row.getCell(27).value = { formula: `IF(OR(D${sLine}="",D${sLine}=0),"",IF(Z${sLine}=D${sLine},"OK (100%)","DIVERGENTE"))`, result: '' };
    row.getCell(27).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(27).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.primaryGreen } };

    for (let c = 1; c <= 27; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sIdx % 2 === 0 ? COLORS.white : COLORS.surfaceBg } };
    }
  }

  // Linha de Totais da Separação por Loja
  const sepTotalLine = 5 + totalTemplateRows;
  const sepTotalRow = ws2.getRow(sepTotalLine);
  sepTotalRow.height = 24;

  ws2.mergeCells(`A${sepTotalLine}:C${sepTotalLine}`);
  const sepTotalLabel = sepTotalRow.getCell(1);
  sepTotalLabel.value = 'TOTAL GERAL DA SEPARAÇÃO POR FILIAL:';
  sepTotalLabel.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.darkNavy } };
  sepTotalLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Total Pedido acumulado (D)
  sepTotalRow.getCell(4).value = { formula: `SUM(D5:D${sepTotalLine - 1})`, result: 0 };
  sepTotalRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
  sepTotalRow.getCell(4).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.primaryGreen } };

  // Reserva CD acumulada (E)
  sepTotalRow.getCell(5).value = { formula: `SUM(E5:E${sepTotalLine - 1})`, result: 0 };
  sepTotalRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
  sepTotalRow.getCell(5).font = { name: 'Segoe UI', size: 8.5, bold: true };

  // Lojas 1 a 20 acumuladas (Colunas F a Y)
  for (let l = 0; l < 20; l++) {
    const colLetter = String.fromCharCode(70 + l); // F = 70
    sepTotalRow.getCell(6 + l).value = { formula: `SUM(${colLetter}5:${colLetter}${sepTotalLine - 1})`, result: 0 };
    sepTotalRow.getCell(6 + l).alignment = { vertical: 'middle', horizontal: 'center' };
    sepTotalRow.getCell(6 + l).font = { name: 'Segoe UI', size: 8.5, bold: true };
  }

  // Total Alocado acumulado (Z)
  sepTotalRow.getCell(26).value = { formula: `SUM(Z5:Z${sepTotalLine - 1})`, result: 0 };
  sepTotalRow.getCell(26).alignment = { vertical: 'middle', horizontal: 'center' };
  sepTotalRow.getCell(26).font = { name: 'Segoe UI', size: 8.5, bold: true };

  // Conferência Geral (AA)
  sepTotalRow.getCell(27).value = { formula: `IF(D${sepTotalLine}=0,"",IF(Z${sepTotalLine}=D${sepTotalLine},"OK (100%)","DIVERGENTE"))`, result: '' };
  sepTotalRow.getCell(27).alignment = { vertical: 'middle', horizontal: 'center' };
  sepTotalRow.getCell(27).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.primaryGreen } };

  for (let c = 1; c <= 27; c++) {
    const cell = sepTotalRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGreenBg } };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.primaryGreen } },
      bottom: { style: 'medium', color: { argb: COLORS.primaryGreen } },
      left: { style: 'thin', color: { argb: 'FFA7F3D0' } },
      right: { style: 'thin', color: { argb: 'FFA7F3D0' } }
    };
  }

  // ===========================================================================
  // ABA 3: INSTRUÇÕES DE PREENCHIMENTO
  // ===========================================================================
  const ws3 = workbook.addWorksheet('INSTRUCOES DE PREENCHIMENTO', {
    views: [{ showGridLines: true }]
  });

  ws3.columns = [
    { width: 5 },
    { width: 28 },
    { width: 14 },
    { width: 16 },
    { width: 65 }
  ];

  ws3.mergeCells('B2:E2');
  const instTitle = ws3.getCell('B2');
  instTitle.value = 'GUIA OFICIAL DE PREENCHIMENTO DA PLANILHA (REDE MEGA 12)';
  instTitle.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: COLORS.white } };
  instTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkNavy } };
  instTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws3.getRow(2).height = 24;

  ws3.mergeCells('B3:E3');
  const instSub = ws3.getCell('B3');
  instSub.value = 'Siga as orientações abaixo para garantir 100% de sucesso na importação e geração da proposta comercial.';
  instSub.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FFD1FAE5' } };
  instSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkSlate } };
  instSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws3.getRow(3).height = 18;

  const instHeaders = ['CAMPO / COLUNA', 'OBRIGATÓRIO?', 'TIPO / FORMATO', 'COMO PREENCHER & ORIENTAÇÕES'];
  const instHeaderRow = ws3.getRow(5);
  instHeaderRow.height = 22;
  instHeaders.forEach((ih, idx) => {
    const cell = instHeaderRow.getCell(idx + 2);
    cell.value = ih;
    cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryGreen } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const fieldsGuide = [
    { name: 'Fornecedor / Razão Social', req: 'SIM', tipo: 'Texto', desc: 'Nome oficial ou razão social da empresa fornecedora. O sistema vincula automaticamente com o cadastro interno.' },
    { name: 'CNPJ do Fornecedor', req: 'RECOMENDADO', tipo: '00.000.000/0001-00', desc: 'Identificador fiscal único para garantir o vínculo sem duplicidades.' },
    { name: 'Vendedor & Contatos', req: 'RECOMENDADO', tipo: 'Texto / Telefone', desc: 'Nome do representante e telefone/WhatsApp para constar no espelho oficial do pedido.' },
    { name: 'Tipo de Frete', req: 'SIM', tipo: 'CIF / FOB / Retira', desc: 'CIF: Por conta do fornecedor. FOB: Frete a cobrar/pago pela Mega 12. Retira: Retirada no local.' },
    { name: 'Condição de Pagamento', req: 'SIM', tipo: 'Texto / Prazos', desc: 'Exemplos: 30/60/90 Dias, Boleto 30 Dias, À Vista. O sistema gera automaticamente o fluxo de duplicatas financeiras.' },
    { name: '% OFF / Desconto Comercial', req: 'OPCIONAL', tipo: 'Percentual (%)', desc: 'Percentual de desconto comercial negociado sobre o pedido (ex: 0%, 5%, 10%). O sistema registra no cabeçalho e preserva os preços unitários líquidos da grade.' },
    { name: 'CÓDIGO FORNECEDOR', req: 'SIM', tipo: 'Texto ou Número', desc: 'Referência do item de acordo com a tabela do fornecedor (ex: 652, REF-1020).' },
    { name: 'DESCRIÇÃO DO PRODUTO', req: 'SIM', tipo: 'Texto Completo', desc: 'Nome claro do produto, material, dimensões ou modelo.' },
    { name: 'UNID.', req: 'SIM', tipo: 'UN / CX / PCT / PAR / JG', desc: 'Unidade de medida. Usado no cálculo de conversão e apontamento de avarias de doca.' },
    { name: 'QTD/CX (Embalagem)', req: 'SIM', tipo: 'Número Inteiro', desc: 'Quantas unidades vêm dentro de cada caixa master ou pacote fechado. (Padrão: 1).' },
    { name: 'QTD CX (Caixas Solicitadas)', req: 'SIM', tipo: 'Número Inteiro', desc: 'Quantidade de caixas ou fardos comprados.' },
    { name: 'TOTAL PEÇAS', req: 'AUTOMÁTICO', tipo: 'Fórmula', desc: 'Calculado automaticamente (= QTD/CX × QTD CX).' },
    { name: 'PREÇO UNIT. (R$)', req: 'SIM', tipo: 'Moeda (R$)', desc: 'Preço unitário líquido de compra da peça já com descontos comerciais aplicados.' },
    { name: 'Aba SEPARAÇÃO POR LOJA', req: 'OPCIONAL', tipo: 'Grade por Filial', desc: 'Se preenchida, o sistema importa as quantidades exatas por filial. Se deixada em branco, o sistema calcula a divisão automática ideal pelos clusters A/B/C.' }
  ];

  fieldsGuide.forEach((fg, fIdx) => {
    const fLine = 6 + fIdx;
    const row = ws3.getRow(fLine);
    row.height = 20;

    row.getCell(2).value = fg.name;
    row.getCell(2).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.darkSlate } };

    row.getCell(3).value = fg.req;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).font = {
      name: 'Segoe UI',
      size: 8,
      bold: true,
      color: {
        argb: fg.req === 'SIM' ? COLORS.primaryGreen : (fg.req === 'AUTOMÁTICO' ? 'FF0284C7' : COLORS.mutedSlate)
      }
    };

    row.getCell(4).value = fg.tipo;
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).font = { name: 'Segoe UI', size: 8, color: { argb: COLORS.darkSlate } };

    row.getCell(5).value = fg.desc;
    row.getCell(5).font = { name: 'Segoe UI', size: 8, color: { argb: COLORS.darkSlate } };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    for (let c = 2; c <= 5; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fIdx % 2 === 0 ? COLORS.white : COLORS.surfaceBg } };
    }
  });

  // ===========================================================================
  // ABA 4: PARÂMETROS FISCAIS
  // ===========================================================================
  const ws4 = workbook.addWorksheet('PARAMETROS FISCAIS', {
    views: [{ showGridLines: true }]
  });

  ws4.columns = [
    { width: 5 },
    { width: 30 },
    { width: 14 },
    { width: 60 }
  ];

  ws4.mergeCells('B2:D2');
  const fiscTitle = ws4.getCell('B2');
  fiscTitle.value = 'PARÂMETROS FISCAIS DE REFERÊNCIA (REDE MEGA 12 - PARANÁ)';
  fiscTitle.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: COLORS.white } };
  fiscTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkNavy } };
  fiscTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws4.getRow(2).height = 24;

  const fiscHeaders = ['PARÂMETRO TRIBUTÁRIO', 'ALÍQUOTA', 'DESCRIÇÃO E APLICAÇÃO'];
  const fiscHRow = ws4.getRow(4);
  fiscHRow.height = 22;
  fiscHeaders.forEach((fh, idx) => {
    const cell = fiscHRow.getCell(idx + 2);
    cell.value = fh;
    cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryGreen } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const fiscItems = [
    { param: 'ICMS Entrada (Crédito)', aliq: '12.0%', desc: 'Crédito tributário abatido do custo do produto na entrada estadual' },
    { param: 'Custos Fixos Operacionais', aliq: '26.0%', desc: 'Percentual operacional incidente sobre o PDV nas lojas físicas' },
    { param: 'ICMS Saída (Alíquota PR)', aliq: '19.5%', desc: 'Alíquota de ICMS sobre a venda final no Estado do Paraná' },
    { param: 'PIS / COFINS / IR', aliq: '6.0%', desc: 'Impostos federais incidentes sobre o faturamento de saída' },
    { param: 'IPI Padrão', aliq: '0.0%', desc: 'Imposto sobre Produtos Industrializados (quando aplicável por NCM)' },
    { param: 'ST (Substituição Tributária)', aliq: '0.0%', desc: 'ICMS-ST destacado por fornecedor (quando aplicável)' }
  ];

  fiscItems.forEach((fi, idx) => {
    const fLine = 5 + idx;
    const row = ws4.getRow(fLine);
    row.height = 20;

    row.getCell(2).value = fi.param;
    row.getCell(2).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.darkSlate } };

    row.getCell(3).value = fi.aliq;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.primaryGreen } };

    row.getCell(4).value = fi.desc;
    row.getCell(4).font = { name: 'Segoe UI', size: 8, color: { argb: COLORS.darkSlate } };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    for (let c = 2; c <= 4; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? COLORS.white : COLORS.surfaceBg } };
    }
  });

  return workbook;
}

/**
 * Dispara o download da Planilha Modelo Oficial no navegador do usuário.
 */
export async function downloadModelTemplate(): Promise<boolean> {
  const filename = 'Planilha_Modelo_Importacao_Pedido_Mega12.xlsx';

  try {
    // 1. Tentar primeiro baixar o arquivo estático pré-compilado se disponível
    const response = await fetch(`/${filename}`);
    if (response.ok) {
      const blob = await response.blob();
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
  } catch (err) {
    console.warn('Tentando geração dinâmica da planilha modelo via ExcelJS...', err);
  }

  // 2. Geração dinâmica em memória com ExcelJS caso o arquivo estático não esteja acessível
  try {
    const workbook = await buildModelWorkbook();
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
  } catch (genErr) {
    console.error('Falha ao gerar planilha modelo dinamicamente:', genErr);
    throw new Error('Não foi possível gerar a planilha modelo para download.');
  }
}
