import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder } from '../shared/types';
import { calculateOrderNetTotal, generateOrderInstallments } from './installments';

const MONTH_NAMES_SHORT: Record<string, string> = {
  '01': 'JANEIRO',
  '02': 'FEVEREIRO',
  '03': 'MARÇO',
  '04': 'ABRIL',
  '05': 'MAIO',
  '06': 'JUNHO',
  '07': 'JULHO',
  '08': 'AGOSTO',
  '09': 'SETEMBRO',
  '10': 'OUTUBRO',
  '11': 'NOVEMBRO',
  '12': 'DEZEMBRO'
};

export function getPrazoExtenso(dueDates: string[]): string {
  if (!dueDates || dueDates.length === 0) return 'À VISTA';
  
  const sortedDates = [...dueDates].filter(Boolean).sort();
  if (sortedDates.length === 0) return 'À VISTA';

  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  const firstMonthKey = firstDate.split('-')[1];
  const lastMonthKey = lastDate.split('-')[1];

  const firstMonthName = MONTH_NAMES_SHORT[firstMonthKey] || '';
  const lastMonthName = MONTH_NAMES_SHORT[lastMonthKey] || '';

  if (!firstMonthName) return 'À VISTA';
  if (firstDate.substring(0, 7) === lastDate.substring(0, 7)) {
    return firstMonthName;
  }

  return `${firstMonthName} A ${lastMonthName}`;
}

export interface MonthlyMatrixRow {
  supplierKey: string;
  orderIds: string[];
  pedidosList: string[];
  empresa: string;
  notaPercent: number;
  valorMenor: number;
  valor12: number;
  pc12: number;
  entrega: string;
  prazo: string;
  monthlyAmounts: Record<string, number>; // chave: "YYYY-MM"
}

export function buildMonthlyMatrixData(orders: PurchaseOrder[]) {
  // 1. Descobrir todos os meses únicos a partir de parcelas e datas de emissão/entrega
  const monthsSet = new Set<string>();
  const now = new Date();
  
  // Garantir pelo menos 7 meses consecutivos a partir do mês atual
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    monthsSet.add(`${y}-${m}`);
  }

  // 1. Deduplicar pedidos por ID (garante que o pedido mais recente prevaleça)
  const uniqueOrdersMap = new Map<string, PurchaseOrder>();
  orders.forEach(ord => {
    if (ord?.header?.id) {
      uniqueOrdersMap.set(ord.header.id, ord);
    }
  });
  const uniqueOrders = Array.from(uniqueOrdersMap.values());

  // 2. Agrupar pedidos por Fornecedor (Razão Social / Nome da Empresa)
  const supplierGroups = new Map<string, {
    empresa: string;
    orderIds: string[];
    pedidosList: string[];
    totalValor12: number;
    totalValorMenor: number;
    totalPecas: number;
    notasList: number[];
    dueDates: string[];
    deliveryDates: string[];
    monthlyAmounts: Record<string, number>;
  }>();

  uniqueOrders.forEach(order => {
    const empresa = (order.header.fornecedor || 'Fornecedor sem nome').trim();
    if (!empresa) return;

    const supplierKey = empresa.toLowerCase();
    const netTotal = calculateOrderNetTotal(order);
    const totalPecas = (order.items || []).reduce((acc, i) => acc + (Number(i.qtdTotalUnidades) || 0), 0);
    const nota = order.header.percentualNota !== undefined ? Number(order.header.percentualNota) : 100;
    const valorMenor = nota < 100 ? (netTotal * (100 - nota) / 100) : 0;

    const insts = (order.installments && order.installments.length > 0)
      ? order.installments
      : generateOrderInstallments(order);

    if (!supplierGroups.has(supplierKey)) {
      supplierGroups.set(supplierKey, {
        empresa,
        orderIds: [],
        pedidosList: [],
        totalValor12: 0,
        totalValorMenor: 0,
        totalPecas: 0,
        notasList: [],
        dueDates: [],
        deliveryDates: [],
        monthlyAmounts: {}
      });
    }

    const group = supplierGroups.get(supplierKey)!;
    group.orderIds.push(order.header.id);
    if (order.header.numeroPedido && !group.pedidosList.includes(order.header.numeroPedido)) {
      group.pedidosList.push(order.header.numeroPedido);
    }
    group.totalValor12 += netTotal;
    group.totalValorMenor += valorMenor;
    group.totalPecas += totalPecas;
    group.notasList.push(nota);

    if (order.header.dataEntregaPrevista) {
      group.deliveryDates.push(order.header.dataEntregaPrevista);
    }

    insts.forEach(inst => {
      if (inst.dataVencimento && inst.dataVencimento.length >= 7) {
        group.dueDates.push(inst.dataVencimento);
        const ym = inst.dataVencimento.substring(0, 7);
        monthsSet.add(ym);
        group.monthlyAmounts[ym] = (group.monthlyAmounts[ym] || 0) + Number(inst.valor || 0);
      }
    });
  });

  const rows: MonthlyMatrixRow[] = [];

  supplierGroups.forEach((group, supplierKey) => {
    // Se o fornecedor tem pedidos, usa a nota exata do pedido mais recente (ou média se forem múltiplas)
    const notaCalculada = group.notasList.length > 0
      ? group.notasList[group.notasList.length - 1]
      : 100;

    const entregaFormatada = group.deliveryDates.length > 0 
      ? group.deliveryDates.sort()[0].split('-').reverse().slice(0, 2).join('/')
      : 'X';

    const prazoFormatado = getPrazoExtenso(group.dueDates);

    rows.push({
      supplierKey,
      orderIds: group.orderIds,
      pedidosList: group.pedidosList,
      empresa: group.empresa,
      notaPercent: notaCalculada,
      valorMenor: group.totalValorMenor,
      valor12: group.totalValor12,
      pc12: group.totalPecas,
      entrega: entregaFormatada,
      prazo: prazoFormatado,
      monthlyAmounts: group.monthlyAmounts
    });
  });

  // Ordenar fornecedores em ordem alfabética (como na planilha)
  rows.sort((a, b) => a.empresa.localeCompare(b.empresa));

  const sortedMonths = Array.from(monthsSet).sort();

  // Totais Consolidados
  let sumValorMenor = 0;
  let sumValor12 = 0;
  let sumPc12 = 0;
  const monthSums: Record<string, number> = {};
  sortedMonths.forEach(m => { monthSums[m] = 0; });

  rows.forEach(r => {
    sumValorMenor += r.valorMenor;
    sumValor12 += r.valor12;
    sumPc12 += r.pc12;
    sortedMonths.forEach(m => {
      monthSums[m] += (r.monthlyAmounts[m] || 0);
    });
  });

  const media12 = sumPc12 > 0 ? (sumValor12 / sumPc12) : 0;

  return {
    rows,
    sortedMonths,
    sumValorMenor,
    sumValor12,
    sumPc12,
    media12,
    monthSums
  };
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'JANEIRO',
  '02': 'FEVEREIRO',
  '03': 'MARÇO',
  '04': 'ABRIL',
  '05': 'MAIO',
  '06': 'JUNHO',
  '07': 'JULHO',
  '08': 'AGOSTO',
  '09': 'SETEMBRO',
  '10': 'OUTUBRO',
  '11': 'NOVEMBRO',
  '12': 'DEZEMBRO'
};

export function formatMonthName(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  const name = MONTH_NAMES[m] || m;
  return `${name} / ${y}`;
}

export function exportMonthlyMatrixPDF(orders: PurchaseOrder[]) {
  const data = buildMonthlyMatrixData(orders);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const dateStr = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;

  // 1. Cabeçalho Principal
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 297, 16, 'F');

  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTROLE MENSAL DE COMPRAS - Jóia ERP', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${dateStr}`, 235, 11);

  // 2. Tabela de Totais no Topo (Cards Resumo como na planilha original)
  const topCols = [
    'TO. MENOR', 
    'TOTAL 12', 
    'PC 12 (PEÇAS)', 
    'MÉDIA 12', 
    ...data.sortedMonths.map(m => formatMonthName(m))
  ];

  const topRowValues = [
    `R$ ${data.sumValorMenor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `R$ ${data.sumValor12.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    data.sumPc12.toLocaleString('pt-BR'),
    `R$ ${data.media12.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ...data.sortedMonths.map(m => 
      `R$ ${(data.monthSums[m] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    )
  ];

  autoTable(doc, {
    startY: 20,
    head: [topCols],
    body: [topRowValues],
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 1.2, halign: 'center', valign: 'middle' },
    headStyles: { 
      fillColor: [185, 28, 28], // Vermelho corporativo
      textColor: [255, 255, 255], 
      fontStyle: 'bold', 
      fontSize: 6.5 
    },
    columnStyles: {
      0: { fillColor: [220, 252, 231], fontStyle: 'bold', textColor: [22, 101, 52] }, // Verde
      1: { fillColor: [254, 240, 138], fontStyle: 'bold', textColor: [133, 77, 14] }, // Amarelo
      2: { fillColor: [254, 249, 195], fontStyle: 'bold', textColor: [133, 77, 14] },
      3: { fillColor: [254, 240, 138], fontStyle: 'bold', textColor: [133, 77, 14] }
    }
  });

  // 3. Tabela Principal da Matriz de Fornecedores e Meses
  const tableHead = [
    'EMPRESA',
    'OFF %',
    'VALOR MENOR',
    'VALOR 12',
    'PC 12',
    'ENTREGA',
    'PRAZO',
    ...data.sortedMonths.map(m => formatMonthName(m))
  ];

  const tableBody = data.rows.map(r => {
    const monthCells = data.sortedMonths.map(m => {
      const v = r.monthlyAmounts[m];
      return v && v > 0 
        ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '-';
    });

    return [
      r.empresa,
      `${r.notaPercent}%`,
      r.valorMenor > 0 ? `R$ ${r.valorMenor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
      `R$ ${r.valor12.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      r.pc12.toLocaleString('pt-BR'),
      r.entrega,
      r.prazo,
      ...monthCells
    ];
  });

  // Linha de Rodapé com os Totais
  const footerRow = [
    'TOTAIS GERAIS',
    '',
    `R$ ${data.sumValorMenor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `R$ ${data.sumValor12.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    data.sumPc12.toLocaleString('pt-BR'),
    '',
    '',
    ...data.sortedMonths.map(m => 
      `R$ ${(data.monthSums[m] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    )
  ];

  const finalStartY = ((doc as any).lastAutoTable?.finalY || 35) + 4;

  autoTable(doc, {
    startY: finalStartY,
    head: [tableHead],
    body: [...tableBody, footerRow],
    theme: 'grid',
    styles: { fontSize: 6.0, cellPadding: 1.0, halign: 'center', valign: 'middle' },
    headStyles: { 
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255], 
      fontStyle: 'bold', 
      fontSize: 6.2 
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 },
      1: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold' }, // NOTA
      2: { fillColor: [220, 252, 231], textColor: [22, 101, 52] }, // VALOR MENOR
      3: { fillColor: [254, 240, 138], textColor: [133, 77, 14], fontStyle: 'bold' }, // VALOR 12
      4: { fillColor: [254, 249, 195], textColor: [133, 77, 14] }, // PC 12
      5: { halign: 'center' }, // ENTREGA
      6: { fillColor: [255, 237, 213], textColor: [154, 52, 18], cellWidth: 26 } // PRAZO (Salmão)
    },
    didParseCell: (dataCell) => {
      // Estilizar a linha de total no rodapé
      if (dataCell.row.index === tableBody.length) {
        dataCell.cell.styles.fillColor = [241, 245, 249];
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  const filename = `Controle_Mensal_Compras_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
  doc.save(filename);
  return true;
}
