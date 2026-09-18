/**
 * Utilitários para conversão e tratamento robusto de datas do Excel (números seriais e strings).
 */

export function parseExcelDate(value: any, fallbackDaysOffset = 15): string {
  if (value === null || value === undefined || value === '' || value === 0 || value === '0') {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + fallbackDaysOffset);
    return formatDateToBR(fallback);
  }

  // Se já for um Date do JS
  if (value instanceof Date && !isNaN(value.getTime())) {
    return formatDateToBR(value);
  }

  // Se for número serial do Excel (ex: 46224 para 21/07/2026)
  if (typeof value === 'number' || (!isNaN(Number(value)) && !String(value).includes('-') && !String(value).includes('/'))) {
    const serial = Number(value);
    if (serial > 10000 && serial < 80000) {
      // Excel epoch: 1899-12-30 (considerando bug bissexto 1900)
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      // Ajustar fuso horário para UTC/Local sem deslocamento de dia
      const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      if (!isNaN(utcDate.getTime())) {
        return formatDateToBR(utcDate);
      }
    }
  }

  // Se for texto string
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Já está no formato DD/MM/YYYY ou DD/MM/YY
    const brMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
    if (brMatch) {
      const day = brMatch[1].padStart(2, '0');
      const month = brMatch[2].padStart(2, '0');
      let year = brMatch[3];
      if (year.length === 2) {
        year = Number(year) > 50 ? `19${year}` : `20${year}`;
      }
      return `${day}/${month}/${year}`;
    }

    // Formato ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}/${m}/${y}`;
    }

    // Tentar Date.parse padrão
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return formatDateToBR(parsed);
    }
  }

  // Fallback padrão
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + fallbackDaysOffset);
  return formatDateToBR(defaultDate);
}

export function formatDateToBR(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatISODateToBR(iso: string): string {
  if (!iso) return '';
  if (iso.includes('/')) return iso;
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}

export function formatBRDateToISO(brDate: string): string {
  if (!brDate) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(brDate)) return brDate;
  const parts = brDate.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return brDate;
}
