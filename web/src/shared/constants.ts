import { FiscalConfig, FiscalPreset, StoreConfig } from './types';

// Configurações fiscais padrão baseadas na planilha modelo para sistema.xlsx
export const DEFAULT_FISCAL_CONFIG: FiscalConfig = {
  // Entrada
  ipiAliquota: 0.00,        // 0%
  aliquotaSt: 0.00,         // 0%
  freteAliquota: 0.00,      // 0%

  // Saída
  creditoEntradaICMS: 0.12, // 12% (ICMS Entrada a descontar do produto)
  custosFixos: 0.26,        // 26% (Custo Fixo sobre PDV)
  icmsAliquota: 0.195,      // 19.5% (ICMS Saída sobre PDV)
  pisCofinsAliquota: 0.06   // 6% (PIS, COFINS, IR sobre PDV)
};

// Modelos fiscais pré-configurados oficiais da Jóia ERP
export const DEFAULT_FISCAL_PRESETS: FiscalPreset[] = [
  {
    id: 'preset_fiscal_padrao',
    name: 'Padrão Geral',
    description: 'Padrão Geral (ICMS Entrada 12%, CF 26%, ICMS Saída 19.5%, PIS/COF 6%)',
    ipiAliquota: 0.00,
    aliquotaSt: 0.00,
    freteAliquota: 0.00,
    creditoEntradaICMS: 0.12,
    custosFixos: 0.26,
    icmsAliquota: 0.195,
    pisCofinsAliquota: 0.06,
    isDefault: true
  }
];

// Percentual padrão de reserva no Estoque Central / CD Matriz: 10%
export const DEFAULT_RESERVE_STOCK_PERCENT = 0.10;

// Lojas cadastradas dinamicamente pelo proprietário da empresa (inicia vazio)
export const DEFAULT_STORES: StoreConfig[] = [];
