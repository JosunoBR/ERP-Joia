import { PurchaseOrder, PaymentInstallment } from '../shared/types';

export const PARCELAS_OPTIONS = [
  { value: 1, label: '1x (À Vista ou 1 Parcela)' },
  { value: 2, label: '2x Parcelas' },
  { value: 3, label: '3x Parcelas' },
  { value: 4, label: '4x Parcelas' },
  { value: 5, label: '5x Parcelas' },
  { value: 6, label: '6x Parcelas' },
  { value: 7, label: '7x Parcelas' },
  { value: 8, label: '8x Parcelas' },
  { value: 9, label: '9x Parcelas' },
  { value: 10, label: '10x Parcelas' },
  { value: 11, label: '11x Parcelas' },
  { value: 12, label: '12x Parcelas' },
  { value: 13, label: '13x Parcelas' },
  { value: 14, label: '14x Parcelas' },
  { value: 15, label: '15x Parcelas' },
  { value: 16, label: '16x Parcelas' },
  { value: 17, label: '17x Parcelas' },
  { value: 18, label: '18x Parcelas' },
  { value: 20, label: '20x Parcelas' },
  { value: 24, label: '24x Parcelas' },
];

export const PRAZO_OPTIONS = [
  { value: '7', label: 'A cada 7 dias (7/14/21...)' },
  { value: '10', label: 'A cada 10 dias (10/20/30...)' },
  { value: '15', label: 'A cada 15 dias (15/30/45...)' },
  { value: '21', label: 'A cada 21 dias (21/42/63...)' },
  { value: '28', label: 'A cada 28 dias (28/56/84...)' },
  { value: '30', label: 'A cada 30 dias (30/60/90...)' },
  { value: 'vista', label: '100% À Vista Integral (TED / PIX)' },
  { value: 'deposito_e_boleto', label: '🏦 Depósito Parcelado + 📄 Boleto Parcelado' },
  { value: 'entrada_com_parcelamento', label: 'Entrada À Vista + Saldo Parcelado' },
];

export const DEPOSITO_PRAZO_OPTIONS = [
  { value: '30', label: 'A cada 30 dias (30/60/90...)' },
  { value: '28', label: 'A cada 28 dias (28/56/84...)' },
  { value: '20', label: 'A cada 20 dias (20/40/60...)' },
  { value: '15', label: 'A cada 15 dias (15/30/45...)' },
  { value: '10', label: 'A cada 10 dias (10/20/30...)' },
  { value: '7', label: 'A cada 7 dias (7/14/21...)' },
  { value: 'vista', label: 'À Vista no Pedido (TED / PIX)' },
];

export const SALDO_PRAZO_OPTIONS = PRAZO_OPTIONS.filter(
  (opt) => !['vista', 'entrada_com_parcelamento', 'deposito_e_boleto'].includes(opt.value)
);

export interface QuickPaymentPreset {
  id: string;
  label: string;
  conditionString: string;
  parcelas: number;
  daysOffsets: number[];
  category: 'semanal' | '30_dias' | '15_dias' | '10_dias' | '45_dias' | 'outros';
}

export const QUICK_PAYMENT_PRESETS: QuickPaymentPreset[] = [
  // 1. Semanal e Ciclos de 7 em 7 Dias
  { id: '7_28', label: '7/14/21/28 (4x)', conditionString: '7/14/21/28 Dias', parcelas: 4, daysOffsets: [7, 14, 21, 28], category: 'semanal' },
  { id: '14_56', label: '14/21/28/35/42/49/56 (7x)', conditionString: '14/21/28/35/42/49/56 Dias', parcelas: 7, daysOffsets: [14, 21, 28, 35, 42, 49, 56], category: 'semanal' },
  { id: '28_42', label: '28/35/42 (3x)', conditionString: '28/35/42 Dias', parcelas: 3, daysOffsets: [28, 35, 42], category: 'semanal' },
  { id: '28_56', label: '28/35/42/49/56 (5x)', conditionString: '28/35/42/49/56 Dias', parcelas: 5, daysOffsets: [28, 35, 42, 49, 56], category: 'semanal' },

  // 2. Iniciando em 30 Dias (30 em 30 / intervalos clássicos)
  { id: '30_30', label: '30 Dias (1x)', conditionString: '30 Dias', parcelas: 1, daysOffsets: [30], category: '30_dias' },
  { id: '30_60', label: '30/60 (2x)', conditionString: '30/60 Dias', parcelas: 2, daysOffsets: [30, 60], category: '30_dias' },
  { id: '30_90', label: '30/90 (2x)', conditionString: '30/90 Dias', parcelas: 2, daysOffsets: [30, 90], category: '30_dias' },
  { id: '30_60_90', label: '30/60/90 (3x)', conditionString: '30/60/90 Dias', parcelas: 3, daysOffsets: [30, 60, 90], category: '30_dias' },
  { id: '30_120', label: '30/60/90/120 (4x)', conditionString: '30/60/90/120 Dias', parcelas: 4, daysOffsets: [30, 60, 90, 120], category: '30_dias' },
  { id: '30_150', label: '30/60/90/120/150 (5x)', conditionString: '30/60/90/120/150 Dias', parcelas: 5, daysOffsets: [30, 60, 90, 120, 150], category: '30_dias' },

  // 3. Iniciando em 30 Dias (15 em 15)
  { id: '30_60_15d', label: '30/45/60 (3x)', conditionString: '30/45/60 Dias', parcelas: 3, daysOffsets: [30, 45, 60], category: '15_dias' },
  { id: '15_90', label: '30/45/60/75/90 (5x)', conditionString: '30/45/60/75/90 Dias', parcelas: 5, daysOffsets: [30, 45, 60, 75, 90], category: '15_dias' },
  { id: '15_120', label: '30/45/60/75/90/105/120 (7x)', conditionString: '30/45/60/75/90/105/120 Dias', parcelas: 7, daysOffsets: [30, 45, 60, 75, 90, 105, 120], category: '15_dias' },
  { id: '15_150', label: '30/45/60/75/90/105/120/135/150 (9x)', conditionString: '30/45/60/75/90/105/120/135/150 Dias', parcelas: 9, daysOffsets: [30, 45, 60, 75, 90, 105, 120, 135, 150], category: '15_dias' },

  // 4. Iniciando em 30 Dias (10 em 10)
  { id: '10_60', label: '30/40/50/60 (4x)', conditionString: '30/40/50/60 Dias', parcelas: 4, daysOffsets: [30, 40, 50, 60], category: '10_dias' },
  { id: '10_90', label: '30/40/50/60/70/80/90 (7x)', conditionString: '30/40/50/60/70/80/90 Dias', parcelas: 7, daysOffsets: [30, 40, 50, 60, 70, 80, 90], category: '10_dias' },
  { id: '10_120', label: '30/40/50/60/70/80/90/100/110/120 (10x)', conditionString: '30/40/50/60/70/80/90/100/110/120 Dias', parcelas: 10, daysOffsets: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120], category: '10_dias' },
  { id: '10_150', label: '30/40/50/60/70/80/90/100/110/120/130/140/150 (13x)', conditionString: '30/40/50/60/70/80/90/100/110/120/130/140/150 Dias', parcelas: 13, daysOffsets: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150], category: '10_dias' },

  // 5. Iniciando em 45 Dias (15 em 15)
  { id: '45_90', label: '45/60/75/90 (4x)', conditionString: '45/60/75/90 Dias', parcelas: 4, daysOffsets: [45, 60, 75, 90], category: '45_dias' },
  { id: '45_120', label: '45/60/75/90/105/120 (6x)', conditionString: '45/60/75/90/105/120 Dias', parcelas: 6, daysOffsets: [45, 60, 75, 90, 105, 120], category: '45_dias' },
  { id: '45_150', label: '45/60/75/90/105/120/135/150 (8x)', conditionString: '45/60/75/90/105/120/135/150 Dias', parcelas: 8, daysOffsets: [45, 60, 75, 90, 105, 120, 135, 150], category: '45_dias' },

  // 6. Iniciando em 45 Dias (10 em 10)
  { id: '45_115', label: '45/55/65/75/85/95/105/115 (8x)', conditionString: '45/55/65/75/85/95/105/115 Dias', parcelas: 8, daysOffsets: [45, 55, 65, 75, 85, 95, 105, 115], category: '45_dias' },
  { id: '45_155', label: '45/55/65/75/85/95/105/115/125/135/145/155 (12x)', conditionString: '45/55/65/75/85/95/105/115/125/135/145/155 Dias', parcelas: 12, daysOffsets: [45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155], category: '45_dias' },

  // 7. À Vista
  { id: 'vista', label: '100% À Vista (TED/PIX)', conditionString: '100% À Vista (TED/PIX)', parcelas: 1, daysOffsets: [0], category: 'outros' },
];

/**
 * Calcula o valor líquido total apenas das mercadorias/produtos (com desconto OFF)
 */
export function calculateOrderMerchandiseTotal(order: PurchaseOrder): number {
  if (!order) return 0;

  const items = order.items || [];
  const offGlobal = Math.max(0, Math.min(100, Number(order.header?.percentualDescontoOff) || 0));

  return items.reduce((sum, it) => {
    if (!it || (!it.descricao && !it.codigo)) return sum;
    if (it.ruptura) return sum;
    const bruto = it.valorTotalBruto || ((it.qtdTotalUnidades || 0) * (it.precoUnitario || 0)) || 0;
    if (bruto <= 0) return sum;

    // Se o item tem percentual de desconto individual > 0, utiliza ele; caso contrário, aplica o OFF global do pedido
    const descPct = (it.percentualDesconto !== undefined && it.percentualDesconto > 0)
      ? Math.max(0, Math.min(100, it.percentualDesconto))
      : offGlobal;

    const liq = (it.valorTotalLiquido !== undefined && it.percentualDesconto !== undefined && it.percentualDesconto > 0) 
      ? it.valorTotalLiquido 
      : (bruto * (1 - descPct / 100));

    return sum + Math.max(0, liq);
  }, 0);
}

/**
 * Calcula o valor líquido total do pedido (itens com desconto OFF + frete + outras despesas)
 */
export function calculateOrderNetTotal(order: PurchaseOrder): number {
  if (!order) return 0;

  const itemsComDesconto = calculateOrderMerchandiseTotal(order);
  const frete = Number(order.header?.valorFrete ?? order.header?.valorFreteGlobal) || 0;
  const outras = Number(order.header?.valorOutrasDespesasGlobal) || 0;
  return Math.max(0, itemsComDesconto + frete + outras);
}

/**
 * Localiza o preset pré-definido correspondente à nova quantidade de parcelas mantendo a cadência e início atuais
 */
export function findMatchingPresetForParcelas(newParc: number, currentPrazo?: string | number): QuickPaymentPreset | undefined {
  const prazoStr = String(currentPrazo || '30').trim().toLowerCase();
  if (newParc <= 1) {
    if (prazoStr === 'vista' || prazoStr === '0') {
      return QUICK_PAYMENT_PRESETS.find(p => p.id === 'vista');
    }
    return QUICK_PAYMENT_PRESETS.find(p => p.id === '30_30');
  }

  // 1. Detecta o início e o passo/cadência a partir do prazo atual
  let start = 30;
  let step = 30;

  const currentPreset = QUICK_PAYMENT_PRESETS.find(p => p.id === prazoStr || p.conditionString.toLowerCase() === prazoStr);
  if (currentPreset && currentPreset.daysOffsets && currentPreset.daysOffsets.length > 0) {
    start = currentPreset.daysOffsets[0];
    step = currentPreset.daysOffsets.length > 1
      ? (currentPreset.daysOffsets[1] - currentPreset.daysOffsets[0])
      : currentPreset.daysOffsets[0];
  } else {
    const interval = parseInt(prazoStr, 10);
    if (!isNaN(interval) && interval > 0) {
      step = interval;
      if (interval === 7) start = 7;
      else if (interval === 21) start = 21;
      else if (interval === 28) start = 28;
      else start = 30;
    }
  }

  // 2. Monta os offsets ideais esperados para a nova quantidade de parcelas
  const expectedOffsets: number[] = [];
  for (let i = 0; i < newParc; i++) {
    expectedOffsets.push(start + i * step);
  }

  // 3. Procura preset com offsets idênticos e quantidade idêntica
  const exactMatch = QUICK_PAYMENT_PRESETS.find(p => 
    p.parcelas === newParc &&
    p.daysOffsets &&
    p.daysOffsets.length === newParc &&
    p.daysOffsets.every((d, idx) => d === expectedOffsets[idx])
  );
  if (exactMatch) return exactMatch;

  // 4. Se não achou exato com mesmo início, procura na mesma cadência (step)
  return QUICK_PAYMENT_PRESETS.find(p => {
    if (p.parcelas !== newParc || !p.daysOffsets || p.daysOffsets.length !== newParc) return false;
    const pStep = p.daysOffsets.length > 1 ? (p.daysOffsets[1] - p.daysOffsets[0]) : p.daysOffsets[0];
    return pStep === step;
  });
}

/**
 * Formata a string de condição de pagamento (ex: "Depósito 2x (R$ 5.000) + Boleto 3x (30/60/90 Dias)")
 */
export function formatPaymentConditionString(
  parcelas: number, 
  prazo: string | number,
  valorEntrada?: number,
  saldoParcelas?: number,
  saldoPrazo?: string | number,
  depositoParcelas?: number,
  depositoPrazo?: string | number,
  depositoForma?: string,
  saldoForma?: string
): string {
  const isCombined = 
    prazo === 'entrada_com_parcelamento' || 
    prazo === 'deposito_e_boleto' ||
    (depositoParcelas !== undefined && saldoParcelas !== undefined && depositoParcelas > 0 && saldoParcelas > 0);

  if (isCombined) {
    const dForma = depositoForma || 'Depósito';
    const sForma = saldoForma || 'Boleto';
    const dParc = depositoParcelas || 1;
    const sParc = saldoParcelas || 2;
    const sPrazo = saldoPrazo || '30';
    const sPrazoStr = formatPaymentConditionString(sParc, sPrazo);

    if (dParc > 1 || (depositoPrazo && depositoPrazo !== 'vista' && depositoPrazo !== '0')) {
      const dPrazo = depositoPrazo || '30';
      const dPrazoStr = formatPaymentConditionString(dParc, dPrazo);
      return `${dForma} ${dParc > 1 ? `${dParc}x (${dPrazoStr})` : dPrazoStr} + ${sForma} ${sParc > 1 ? `${sParc}x (${sPrazoStr})` : sPrazoStr}`;
    }

    return `${dForma} À Vista + ${sForma} ${sParc > 1 ? `${sParc}x (${sPrazoStr})` : sPrazoStr}`;
  }

  if (prazo === 'vista' || (parcelas === 1 && prazo === 'vista')) {
    return '100% À Vista (TED/PIX)';
  }

  const prazoStr = String(prazo).trim();
  if (prazoStr === '30_90' || prazoStr.replace(/\s*dias$/i, '').trim() === '30/90') {
    return parcelas === 3 ? '30/60/90 Dias' : '30/90 Dias';
  }
  if (prazoStr === '30_60_90' || prazoStr.replace(/\s*dias$/i, '').trim() === '30/60/90') {
    return '30/60/90 Dias';
  }

  // Verifica se o prazo corresponde a um dos modelos pré-definidos
  const matchedPreset = QUICK_PAYMENT_PRESETS.find(p => p.id === prazoStr || p.conditionString.toLowerCase() === prazoStr.toLowerCase());
  if (matchedPreset) {
    return matchedPreset.conditionString;
  }

  // Se o prazo é uma sequência explícita com barras (ex: "30/90", "30/60/90", "15/30/45")
  if (prazoStr.includes('/')) {
    const cleanSeq = prazoStr.replace(/\s*dias$/i, '').trim();
    return `${cleanSeq} Dias`;
  }

  const intervalo = Number(prazo);
  if (!isNaN(intervalo) && intervalo > 0) {
    if (parcelas === 1) {
      return `${intervalo} Dias`;
    }
    const days: number[] = [];
    for (let i = 1; i <= parcelas; i++) {
      days.push(i * intervalo);
    }
    return `${days.join('/')} Dias`;
  }
  if (prazo === 'custom') {
    return `${parcelas}x Personalizado`;
  }
  return `${parcelas}x Parcelas`;
}

export interface ParsedPaymentCondition {
  parcelas: number;
  prazo: string;
  daysOffsets?: number[];
}

/**
 * Extrai quantidade de parcelas, prazo e offsets de dias a partir da string de condição
 */
export function parsePaymentConditionString(cond?: string): ParsedPaymentCondition {
  if (!cond || typeof cond !== 'string' || cond.trim() === '') {
    return { parcelas: 3, prazo: '30', daysOffsets: [30, 60, 90] };
  }
  const clean = cond.trim();
  const lower = clean.toLowerCase();

  // 1. Verifica se bate diretamente com um dos presets rápidos
  const matchedPreset = QUICK_PAYMENT_PRESETS.find(p => 
    p.id.toLowerCase() === lower ||
    p.conditionString.toLowerCase() === lower ||
    p.label.toLowerCase() === lower ||
    lower.startsWith(p.label.toLowerCase()) ||
    lower.startsWith(p.conditionString.toLowerCase())
  );
  if (matchedPreset) {
    if (matchedPreset.id === 'vista') {
      return { parcelas: 1, prazo: 'vista', daysOffsets: [0] };
    }
    if (matchedPreset.parcelas === 1) {
      const offset = (matchedPreset.daysOffsets && matchedPreset.daysOffsets[0]) || 30;
      return {
        parcelas: 1,
        prazo: String(offset),
        daysOffsets: [offset]
      };
    }
    return {
      parcelas: matchedPreset.parcelas,
      prazo: matchedPreset.id,
      daysOffsets: [...matchedPreset.daysOffsets]
    };
  }

  // 2. Modos especiais
  if ((lower.includes('depósito') || lower.includes('deposito')) && (lower.includes('boleto') || lower.includes('cheque'))) {
    const xMatches = [...clean.matchAll(/(\d+)x/gi)];
    let totalP = 0;
    if (xMatches.length > 0) {
      totalP = xMatches.reduce((acc, m) => acc + parseInt(m[1], 10), 0);
      if (lower.includes('à vista') || lower.includes('a vista')) {
        totalP += 1;
      }
    }
    return { parcelas: totalP > 0 ? totalP : 3, prazo: 'deposito_e_boleto' };
  }
  if (lower.includes('entrada') && (lower.includes('+') || lower.includes('saldo') || lower.includes('dias') || lower.includes('x'))) {
    const xMatches = [...clean.matchAll(/(\d+)x/gi)];
    let totalP = 0;
    if (xMatches.length > 0) {
      totalP = xMatches.reduce((acc, m) => acc + parseInt(m[1], 10), 0);
      if (lower.includes('à vista') || lower.includes('a vista')) {
        totalP += 1;
      }
    }
    return { parcelas: totalP > 0 ? totalP : 3, prazo: 'entrada_com_parcelamento' };
  }
  if (lower.includes('vista') || lower.includes('ted') || lower.includes('pix')) {
    return { parcelas: 1, prazo: 'vista', daysOffsets: [0] };
  }

  // 3. Sequência de dias com barra (ex: "30/90", "30/60/90 Dias", "30/40/50/60/70/80/90/100/110/120 Dias")
  const cleanWithoutNotes = clean.replace(/\(\s*\d+\/\d+d?[^)]*\)/gi, '');
  if (cleanWithoutNotes.includes('/')) {
    const parts = cleanWithoutNotes.split('/').map(p => {
      const m = p.match(/\b\d+\b/);
      return m ? parseInt(m[0], 10) : null;
    }).filter((n): n is number => n !== null && n > 0 && n <= 720);

    if (parts.length >= 2) {
      // 3.1 Procura se bate com um preset pré-definido pelos offsets exatos
      const matchingPreset = QUICK_PAYMENT_PRESETS.find(p => 
        p.daysOffsets && p.daysOffsets.length === parts.length &&
        p.daysOffsets.every((d, idx) => d === parts[idx])
      );
      if (matchingPreset) {
        return {
          parcelas: matchingPreset.parcelas,
          prazo: matchingPreset.id,
          daysOffsets: [...matchingPreset.daysOffsets]
        };
      }

      return {
        parcelas: parts.length,
        prazo: parts.join('/'),
        daysOffsets: parts
      };
    }
  }

  // 4. Faixa "X a Y" (ex: "30 a 120" ou "30 a 90")
  const rangeMatch = clean.match(/(\d+)\s*(?:a|ate|até|-)\s*(\d+)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (start >= 5 && end > start && end <= 720) {
      let step = 30;
      if (lower.includes('10/10') || lower.includes('10 em 10') || lower.includes('10d') || ((end - start) % 10 === 0 && lower.includes('10'))) {
        step = 10;
      } else if (lower.includes('15/15') || lower.includes('15 em 15') || lower.includes('15d') || ((end - start) % 15 === 0 && lower.includes('15'))) {
        step = 15;
      } else if (lower.includes('7/7') || lower.includes('7 em 7') || lower.includes('7d') || lower.includes('semanal')) {
        step = 7;
      }
      const offsets: number[] = [];
      for (let d = start; d <= end; d += step) {
        offsets.push(d);
      }
      return {
        parcelas: offsets.length,
        prazo: String(step),
        daysOffsets: offsets
      };
    }
  }

  // 5. Formato "Nx" (ex: "3x", "4x", "10x")
  const matchX = clean.match(/(\d+)\s*x/i);
  let parcelas = matchX ? parseInt(matchX[1], 10) : 0;

  let prazo = '30';
  if (lower.includes('7 dias') || lower.includes('cada 7') || lower.includes('semanal') || lower.includes('7/')) prazo = '7';
  else if (lower.includes('10 dias') || lower.includes('cada 10') || lower.includes('10/')) prazo = '10';
  else if (lower.includes('15 dias') || lower.includes('cada 15') || lower.includes('15/')) prazo = '15';
  else if (lower.includes('20 dias') || lower.includes('cada 20')) prazo = '20';
  else if (lower.includes('21 dias') || lower.includes('cada 21') || lower.includes('21/')) prazo = '21';
  else if (lower.includes('28 dias') || lower.includes('cada 28') || lower.includes('28/')) prazo = '28';
  else if (lower.includes('30 dias') || lower.includes('cada 30') || lower.includes('mensal') || lower.includes('30/')) prazo = '30';

  const numPrazo = Number(prazo) || 30;
  const count = parcelas || 3;
  const offsets: number[] = [];
  for (let i = 1; i <= count; i++) {
    offsets.push(i * numPrazo);
  }

  return { parcelas: count, prazo, daysOffsets: offsets };
}

/**
 * Converte com segurança datas em formato DD/MM/YYYY ou YYYY-MM-DD em objeto Date UTC
 */
export function parseDateFlexible(dateStr: string): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      let y = parseInt(parts[2], 10);
      if (y < 100) y += y > 50 ? 1900 : 2000;
      const dt = new Date(Date.UTC(y, m, d));
      return isNaN(dt.getTime()) ? null : dt;
    }
  } else if (str.includes('-')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
        return isNaN(dt.getTime()) ? null : dt;
      } else {
        const dt = new Date(Date.UTC(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])));
        return isNaN(dt.getTime()) ? null : dt;
      }
    }
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Adiciona dias a uma data suportando formato DD/MM/YYYY e YYYY-MM-DD
 */
export function addDaysToDate(dateStr: string, days: number): string {
  try {
    const dt = parseDateFlexible(dateStr);
    if (!dt) return dateStr;
    dt.setUTCDate(dt.getUTCDate() + days);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calcula a diferença em dias exatos entre duas datas (DD/MM/YYYY ou YYYY-MM-DD)
 */
export function getDaysDifference(d1: string, d2: string): number {
  try {
    const dt1 = parseDateFlexible(d1);
    const dt2 = parseDateFlexible(d2);
    if (!dt1 || !dt2) return 0;
    const diffMs = dt2.getTime() - dt1.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Determina o status do boleto com base na data de vencimento e pagamento
 */
export function getInstallmentStatus(
  dataVencimento: string, 
  dataPagamento?: string
): 'A Vencer' | 'Vence Hoje' | 'Em Atraso' | 'Pago' {
  if (dataPagamento && dataPagamento.trim() !== '') {
    return 'Pago';
  }
  if (!dataVencimento) return 'A Vencer';

  const todayStr = new Date().toISOString().split('T')[0];
  if (dataVencimento === todayStr) {
    return 'Vence Hoje';
  }
  if (dataVencimento < todayStr) {
    return 'Em Atraso';
  }
  return 'A Vencer';
}

/**
 * Gera a lista de parcelas/boletos calculados para o pedido, preservando acordos já editados se aplicável
 */
export function generateOrderInstallments(
  order: PurchaseOrder,
  customParcelas?: number,
  customPrazo?: string | number,
  preserveExistingEdits = true
): PaymentInstallment[] {
  if (!order || !order.header) return [];

  const parsed = parsePaymentConditionString(order.header.condicaoPagamento);
  const prazo = String(customPrazo ?? order.header.prazoDias ?? parsed.prazo ?? '30');
  const netTotal = calculateOrderNetTotal(order);
  const customDates = order.header.datasVencimentoPersonalizadas;

  // A primeira parcela a prazo é contada a partir da data de entrega da mercadoria
  const baseDeliveryDate = addDaysToDate(order.header.dataEntregaPrevista || order.header.dataPedido || new Date().toISOString().split('T')[0], 0);
  const orderDate = addDaysToDate(order.header.dataPedido || new Date().toISOString().split('T')[0], 0);

  const existingMap = new Map<number, PaymentInstallment>();
  if (preserveExistingEdits && Array.isArray(order.installments)) {
    order.installments.forEach(inst => {
      existingMap.set(inst.numeroParcela, inst);
    });
  }

  const list: PaymentInstallment[] = [];
  const valorFrete = Number(order.header?.valorFrete ?? order.header?.valorFreteGlobal) || 0;
  const valorBaseMercadoria = Math.max(0, netTotal - valorFrete);

  // CENÁRIO A: NEGOCIAÇÃO MISTA (DEPÓSITO PARCELADO + SALDO EM BOLETO PARCELADO)
  if (prazo === 'entrada_com_parcelamento' || prazo === 'deposito_e_boleto' || order.header.formaPagamento === 'Boleto / Depósito') {
    const totalParcelasDeposito = Math.max(1, order.header.depositoParcelasCount || (prazo === 'deposito_e_boleto' ? 2 : 1));
    const depositoPrazo = String(order.header.depositoPrazoDias || (totalParcelasDeposito === 1 ? 'vista' : '30'));
    const isProporcional = order.header.isEntradaProporcional !== false;
    const targetPctDep = order.header.percentualEntrada !== undefined 
      ? order.header.percentualEntrada 
      : ((order.header.percentualNota !== undefined && order.header.percentualNota > 0 && order.header.percentualNota < 100)
          ? Math.max(0, 100 - order.header.percentualNota)
          : (prazo === 'deposito_e_boleto' ? 50 : 30));
    const valorTotalDeposito = isProporcional && valorBaseMercadoria > 0
      ? Number((valorBaseMercadoria * (targetPctDep / 100)).toFixed(2))
      : Math.min(valorBaseMercadoria, Math.max(0, order.header.valorEntradaAVista || 0));
    const saldoRestante = Math.max(0, valorBaseMercadoria - valorTotalDeposito);
    const totalParcelasSaldo = Math.max(1, order.header.saldoParcelasCount || 2);
    const saldoPrazo = String(order.header.saldoPrazoDias || '30');
    const totalParcelasGeral = totalParcelasDeposito + totalParcelasSaldo;

    // Regra: por padrão a primeira parcela vence 10 dias após a previsão de entrega
    const firstDueDate = addDaysToDate(baseDeliveryDate, 10);

    // 1. Parcelas de Depósito / PIX
    const depBaseValue = totalParcelasDeposito > 0 ? Number((valorTotalDeposito / totalParcelasDeposito).toFixed(2)) : valorTotalDeposito;
    const depRemainder = totalParcelasDeposito > 0 ? Number((valorTotalDeposito - depBaseValue * totalParcelasDeposito).toFixed(2)) : 0;

    let lastDepositDate = '';

    for (let d = 1; d <= totalParcelasDeposito; d++) {
      const existingDep = existingMap.get(d);
      const customDepDate = customDates?.[String(d)];

      let calculatedDueDate = '';
      const matchedDepPreset = QUICK_PAYMENT_PRESETS.find(p => p.id === depositoPrazo || p.conditionString.toLowerCase() === depositoPrazo.toLowerCase());
      if (depositoPrazo === 'vista') {
        calculatedDueDate = addDaysToDate(orderDate, 0);
      } else if (matchedDepPreset && matchedDepPreset.daysOffsets && matchedDepPreset.daysOffsets[d - 1] !== undefined) {
        calculatedDueDate = addDaysToDate(baseDeliveryDate, matchedDepPreset.daysOffsets[d - 1]);
      } else {
        const interval = Number(depositoPrazo) || 30;
        const dueDays = (d - 1) * interval;
        calculatedDueDate = addDaysToDate(firstDueDate, dueDays);
      }

      lastDepositDate = calculatedDueDate;

      const origVal = d === 1 ? Number((depBaseValue + depRemainder).toFixed(2)) : depBaseValue;
      const isDepManuallyOverridden = existingDep?.valor !== undefined && existingDep?.valorOriginal !== undefined && Math.abs(existingDep.valor - existingDep.valorOriginal) > 0.01;
      const valorFinal = isDepManuallyOverridden ? existingDep.valor : origVal;
      const rawDataVenc = customDepDate || calculatedDueDate;
      const dataVencFinal = addDaysToDate(rawDataVenc, 0);
      const statusFinal = existingDep?.status || getInstallmentStatus(dataVencFinal, existingDep?.dataPagamento);
      const depFormaLabel = order.header.depositoFormaPagamento || 'Depósito';

      list.push({
        id: existingDep?.id || `inst_${order.header.id || 'ord'}_dep_${d}_${Date.now()}`,
        orderId: order.header.id,
        numeroPedido: order.header.numeroPedido,
        fornecedor: order.header.fornecedor,
        numeroParcela: d,
        totalParcelas: totalParcelasGeral,
        dataVencimento: dataVencFinal,
        valor: valorFinal,
        valorOriginal: isDepManuallyOverridden ? existingDep.valorOriginal : origVal,
        status: statusFinal,
        dataPagamento: existingDep?.dataPagamento,
        observacao: existingDep?.observacao || (totalParcelasDeposito === 1 && depositoPrazo === 'vista' ? `Entrada / Sinal À Vista (${depFormaLabel})` : `${depFormaLabel} ${d}/${totalParcelasDeposito}`),
        documentoRef: existingDep?.documentoRef,
        tipoTitulo: 'mercadoria',
        metodoPagamento: depFormaLabel,
        isBoletoFrete: false,
        updatedAt: new Date().toISOString()
      });
    }

    // 2. Parcelas do Saldo em Boleto
    const saldoBaseValue = totalParcelasSaldo > 0 ? Number((saldoRestante / totalParcelasSaldo).toFixed(2)) : saldoRestante;
    const saldoRemainder = totalParcelasSaldo > 0 ? Number((saldoRestante - saldoBaseValue * totalParcelasSaldo).toFixed(2)) : 0;
    const matchedSalPreset = QUICK_PAYMENT_PRESETS.find(p => p.id === saldoPrazo || p.conditionString.toLowerCase() === saldoPrazo.toLowerCase());
    const salFormaLabel = order.header.saldoFormaPagamento || 'Boleto';

    for (let j = 1; j <= totalParcelasSaldo; j++) {
      const numParcela = totalParcelasDeposito + j;
      const existing = existingMap.get(numParcela);

      const intervalNum = Number(saldoPrazo) || 30;
      let calculatedDueDate = '';

      if (matchedSalPreset && matchedSalPreset.daysOffsets && matchedSalPreset.daysOffsets[j - 1] !== undefined) {
        calculatedDueDate = addDaysToDate(baseDeliveryDate, matchedSalPreset.daysOffsets[j - 1]);
      } else if (totalParcelasDeposito === 1 && depositoPrazo === 'vista') {
        // Se a entrada foi à vista, o saldo em boleto inicia no 1º vencimento (10 dias após a entrega por padrão)
        calculatedDueDate = addDaysToDate(firstDueDate, (j - 1) * intervalNum);
      } else if (lastDepositDate && depositoPrazo !== 'vista') {
        // Se o depósito foi parcelado, os boletos correm após o último depósito
        calculatedDueDate = addDaysToDate(lastDepositDate, j * intervalNum);
      } else {
        calculatedDueDate = addDaysToDate(firstDueDate, (j - 1) * intervalNum);
      }

      const originalProportionalVal = j === 1 ? Number((saldoBaseValue + saldoRemainder).toFixed(2)) : saldoBaseValue;

      const customSaldoDate = customDates?.[String(numParcela)];
      const isManuallyOverridden = existing?.valor !== undefined && existing?.valorOriginal !== undefined && Math.abs(existing.valor - existing.valorOriginal) > 0.01;
      const valorFinal = isManuallyOverridden ? existing.valor : originalProportionalVal;
      const rawDueDate = customSaldoDate || calculatedDueDate;
      const dataVencimentoFinal = addDaysToDate(rawDueDate, 0);
      const statusFinal = existing?.status || getInstallmentStatus(dataVencimentoFinal, existing?.dataPagamento);

      list.push({
        id: existing?.id || `inst_${order.header.id || 'ord'}_bol_${j}_${Date.now()}`,
        orderId: order.header.id,
        numeroPedido: order.header.numeroPedido,
        fornecedor: order.header.fornecedor,
        numeroParcela: numParcela,
        totalParcelas: totalParcelasGeral,
        dataVencimento: dataVencimentoFinal,
        valor: valorFinal,
        valorOriginal: isManuallyOverridden ? existing.valorOriginal : originalProportionalVal,
        status: statusFinal,
        dataPagamento: existing?.dataPagamento,
        observacao: existing?.observacao || `${salFormaLabel} ${j}/${totalParcelasSaldo}`,
        documentoRef: existing?.documentoRef,
        tipoTitulo: 'mercadoria',
        metodoPagamento: salFormaLabel,
        isBoletoFrete: false,
        updatedAt: new Date().toISOString()
      });
    }
  } else {
    // CENÁRIO B: PARCELAMENTO PADRÃO (OU 100% À VISTA)
    const totalParcelas = customParcelas ?? order.header.parcelasCount ?? parsed.parcelas ?? 3;
    const baseValue = totalParcelas > 0 ? Number((valorBaseMercadoria / totalParcelas).toFixed(2)) : valorBaseMercadoria;
    const remainder = totalParcelas > 0 ? Number((valorBaseMercadoria - baseValue * totalParcelas).toFixed(2)) : 0;

    const daysOffsets = (parsed.daysOffsets && parsed.daysOffsets.length === totalParcelas)
      ? parsed.daysOffsets
      : undefined;

    // Regra: por padrão a primeira parcela vence 10 dias após a previsão de entrega
    const firstDueDate = addDaysToDate(baseDeliveryDate, 10);

    for (let i = 1; i <= totalParcelas; i++) {
      const existing = existingMap.get(i);

      let dueDays = 0;
      let calculatedDueDate = '';

      if (prazo === 'vista') {
        dueDays = 0;
        calculatedDueDate = addDaysToDate(orderDate, 0);
      } else {
        const intervalNum = Number(prazo) || 30;
        const diffFromFirst = (daysOffsets && daysOffsets.length >= i)
          ? (daysOffsets[i - 1] - daysOffsets[0])
          : (i - 1) * intervalNum;

        dueDays = diffFromFirst;
        calculatedDueDate = addDaysToDate(firstDueDate, diffFromFirst);
      }

      const originalProportionalVal = i === 1 ? Number((baseValue + remainder).toFixed(2)) : baseValue;

      const customDate = customDates?.[String(i)];
      const isManuallyOverridden = existing?.valor !== undefined && existing?.valorOriginal !== undefined && Math.abs(existing.valor - existing.valorOriginal) > 0.01;
      const valorFinal = isManuallyOverridden ? existing.valor : originalProportionalVal;
      // Stale dates fix: recalculate dynamically if not explicitly in customDates
      const rawDueDate = customDate || calculatedDueDate;
      const dataVencimentoFinal = addDaysToDate(rawDueDate, 0);
      const statusFinal = existing?.status || getInstallmentStatus(dataVencimentoFinal, existing?.dataPagamento);

      const obsText = prazo === 'vista' 
        ? 'Pagamento 100% À Vista' 
        : `Parcela ${i}/${totalParcelas} (${dueDays === 0 ? '10d da Entrega' : `+${dueDays}d`})`;

      list.push({
        id: existing?.id || `inst_${order.header.id || 'ord'}_${i}_${Date.now()}`,
        orderId: order.header.id,
        numeroPedido: order.header.numeroPedido,
        fornecedor: order.header.fornecedor,
        numeroParcela: i,
        totalParcelas: totalParcelas,
        dataVencimento: dataVencimentoFinal,
        valor: valorFinal,
        valorOriginal: isManuallyOverridden ? existing.valorOriginal : originalProportionalVal,
        status: statusFinal,
        dataPagamento: existing?.dataPagamento,
        observacao: existing?.observacao || obsText,
        documentoRef: existing?.documentoRef,
        tipoTitulo: 'mercadoria',
        isBoletoFrete: false,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // CENÁRIO C: BOLETO AUTOMÁTICO DE FRETE (10 DIAS APÓS A DATA DE ENTREGA)
  if (valorFrete > 0) {
    const freteDueDate = addDaysToDate(baseDeliveryDate, 10);
    // Verificar se já existia um boleto de frete preservado
    const existingFrete = Array.isArray(order.installments)
      ? order.installments.find(inst => inst.isBoletoFrete || inst.tipoTitulo === 'frete' || inst.observacao?.toLowerCase().includes('frete'))
      : undefined;

    const nextParcelaNum = list.length + 1;
    const customFreteDate = customDates?.['frete'] || customDates?.[String(nextParcelaNum)];

    const isFreteManuallyOverridden = existingFrete?.valor !== undefined && existingFrete?.valorOriginal !== undefined && Math.abs(existingFrete.valor - existingFrete.valorOriginal) > 0.01;
    const valorFreteFinal = isFreteManuallyOverridden ? existingFrete.valor : valorFrete;
    const rawFreteDate = customFreteDate || existingFrete?.dataVencimento || freteDueDate;
    const dataVencFrete = addDaysToDate(rawFreteDate, 0);
    const statusFrete = existingFrete?.status || getInstallmentStatus(dataVencFrete, existingFrete?.dataPagamento);

    list.push({
      id: existingFrete?.id || `inst_frete_${order.header.id || 'ord'}_${Date.now()}`,
      orderId: order.header.id,
      numeroPedido: order.header.numeroPedido,
      fornecedor: order.header.fornecedor ? `${order.header.fornecedor} (Frete)` : 'Transportadora / Frete',
      numeroParcela: nextParcelaNum,
      totalParcelas: nextParcelaNum,
      dataVencimento: dataVencFrete,
      valor: valorFreteFinal,
      valorOriginal: isFreteManuallyOverridden ? existingFrete.valorOriginal : valorFrete,
      status: statusFrete,
      dataPagamento: existingFrete?.dataPagamento,
      observacao: existingFrete?.observacao || 'Boleto de Frete (10 dias após a entrega)',
      documentoRef: existingFrete?.documentoRef || 'Boleto Frete',
      isBoletoFrete: true,
      tipoTitulo: 'frete',
      updatedAt: new Date().toISOString()
    });
  }

  return list;
}
