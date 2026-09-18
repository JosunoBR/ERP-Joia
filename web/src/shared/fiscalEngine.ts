import { FiscalConfig, OrderItemFiscalOverride } from './types';
import { DEFAULT_FISCAL_CONFIG } from './constants';

export interface FiscalCalculationResult {
  // Parte 1: Entrada (Custo Real Fornecedor)
  ipiUnit: number;
  stUnit: number;
  freteUnit: number;
  custoRealEntrada: number; // Encargos adicionais de entrada (IPI + ST + Frete)
  custoFornecedor: number;  // Preço Compra + Custo Real Entrada

  // Parte 2: Saída (Custo Loja)
  baseIcmsEntrada: number;  // Preço Compra - ICMS Entrada
  custoFixoUnit: number;    // Custo Fixo sobre PDV
  icmsSaidaUnit: number;    // ICMS Saída sobre PDV
  pisCofinsUnit: number;    // PIS, COFINS, IR sobre PDV
  custoLoja: number;        // Custo total da Loja

  // Margem
  margemRealUnit: number;   // PDV - Custo Loja
  margemPercentual: number; // (Margem Real / PDV) * 100
  isLucrativo: boolean;
  statusMargem: 'excelente' | 'boa' | 'apertada' | 'prejuizo';

  // Retrocompatibilidade
  percentualDespesasPdv: number;
  percentualCreditoEntrada: number;
  despesasPdvUnit: number;
  creditoIcmsUnit: number;
  custoRealEfetivo: number;
}

// Normaliza alíquota para decimal (ex: 5 -> 0.05 ou 0.05 -> 0.05)
export function normalizeRateToDecimal(val: number | undefined | null, defaultDecimal: number = 0): number {
  if (val === undefined || val === null || isNaN(val)) return defaultDecimal;
  return val > 1 ? val / 100 : val;
}

export function calculateItemFiscal(
  precoCompra: number,
  pdvAlvo: number,
  globalConfig: FiscalConfig = DEFAULT_FISCAL_CONFIG,
  override?: OrderItemFiscalOverride
): FiscalCalculationResult {
  const pCompra = Math.max(0, precoCompra || 0);
  const pdv = Math.max(0, pdvAlvo || 0);

  // Alíquotas de Entrada
  const ipiRate = normalizeRateToDecimal(
    override?.useCustomFiscal && override.ipiAliquota !== undefined 
      ? override.ipiAliquota 
      : globalConfig.ipiAliquota,
    0
  );
  const stRate = normalizeRateToDecimal(
    override?.useCustomFiscal && override.aliquotaSt !== undefined
      ? override.aliquotaSt
      : globalConfig.aliquotaSt,
    0
  );
  const freteRate = normalizeRateToDecimal(
    override?.useCustomFiscal && override.freteAliquota !== undefined
      ? override.freteAliquota
      : globalConfig.freteAliquota,
    0
  );

  // Alíquotas de Saída
  const icmsEntradaRate = normalizeRateToDecimal(
    override?.useCustomFiscal && override.creditoEntradaICMS !== undefined
      ? override.creditoEntradaICMS
      : globalConfig.creditoEntradaICMS,
    0.12
  );
  const custoFixoRate = normalizeRateToDecimal(
    override?.useCustomFiscal && override.custosFixos !== undefined
      ? override.custosFixos
      : globalConfig.custosFixos,
    0.26
  );
  const icmsSaidaRate = normalizeRateToDecimal(
    override?.useCustomFiscal && override.icmsAliquota !== undefined
      ? override.icmsAliquota
      : globalConfig.icmsAliquota,
    0.195
  );
  const pisCofinsRate = normalizeRateToDecimal(
    override?.useCustomFiscal && override.pisCofinsAliquota !== undefined
      ? override.pisCofinsAliquota
      : globalConfig.pisCofinsAliquota,
    0.06
  );

  // PARTE 1: ENTRADA (Custo Real Fornecedor)
  // Conforme planilha: VALOR DO ITEM ACRESCENTA IPI, ST E FRETE
  const ipiUnit = Number((pCompra * ipiRate).toFixed(4));
  const stUnit = Number((pCompra * stRate).toFixed(4));
  const freteUnit = Number((pCompra * freteRate).toFixed(4));
  const custoRealEntrada = Number((ipiUnit + stUnit + freteUnit).toFixed(4));
  const custoFornecedor = Number((pCompra + custoRealEntrada).toFixed(4));

  // PARTE 2: SAÍDA (Custo Loja)
  // 1. Valor do item desconta ICMS Entrada:
  const baseIcmsEntrada = Number((pCompra * (1 - icmsEntradaRate)).toFixed(4));
  // 2. Custo fixo multiplica por PDV:
  const custoFixoUnit = Number((pdv * custoFixoRate).toFixed(4));
  // 3. Encargos e Frete (Custo Real da Entrada): custoRealEntrada
  // 4. ICMS Saída multiplica por PDV:
  const icmsSaidaUnit = Number((pdv * icmsSaidaRate).toFixed(4));
  // 5. PIS/COFINS/IR multiplica por PDV:
  const pisCofinsUnit = Number((pdv * pisCofinsRate).toFixed(4));

  // Custo Loja = Base (-ICMS Ent) + Custo Real Entrada + Custo Fixo PDV + ICMS Saída PDV + PIS/COFINS/IR PDV
  const custoLoja = Number((baseIcmsEntrada + custoRealEntrada + custoFixoUnit + icmsSaidaUnit + pisCofinsUnit).toFixed(4));

  // MARGEM
  const margemRealUnit = Number((pdv - custoLoja).toFixed(4));
  const margemPercentual = pdv > 0 ? Number(((margemRealUnit / pdv) * 100).toFixed(2)) : 0;

  let statusMargem: 'excelente' | 'boa' | 'apertada' | 'prejuizo' = 'boa';
  if (margemPercentual >= 20) {
    statusMargem = 'excelente';
  } else if (margemPercentual >= 10) {
    statusMargem = 'boa';
  } else if (margemPercentual > 0) {
    statusMargem = 'apertada';
  } else {
    statusMargem = 'prejuizo';
  }

  return {
    ipiUnit,
    stUnit,
    freteUnit,
    custoRealEntrada,
    custoFornecedor,
    baseIcmsEntrada,
    custoFixoUnit,
    icmsSaidaUnit,
    pisCofinsUnit,
    custoLoja,
    margemRealUnit,
    margemPercentual,
    isLucrativo: margemRealUnit > 0,
    statusMargem,
    // Retrocompatibilidade
    percentualDespesasPdv: custoFixoRate + icmsSaidaRate + pisCofinsRate,
    percentualCreditoEntrada: icmsEntradaRate,
    despesasPdvUnit: custoFixoUnit + icmsSaidaUnit + pisCofinsUnit,
    creditoIcmsUnit: Number((pCompra * icmsEntradaRate).toFixed(4)),
    custoRealEfetivo: custoLoja
  };
}

export function calculateMaxPurchasePrice(
  pdvAlvo: number,
  margemAlvoPercentual: number = 20,
  globalConfig: FiscalConfig = DEFAULT_FISCAL_CONFIG,
  override?: OrderItemFiscalOverride
): number {
  const pdv = Math.max(0, pdvAlvo || 0);
  const margemDecimal = margemAlvoPercentual / 100;

  const ipiRate = normalizeRateToDecimal(override?.ipiAliquota ?? globalConfig.ipiAliquota, 0);
  const stRate = normalizeRateToDecimal(override?.aliquotaSt ?? globalConfig.aliquotaSt, 0);
  const freteRate = normalizeRateToDecimal(override?.freteAliquota ?? globalConfig.freteAliquota, 0);
  const encargosEntradaRate = ipiRate + stRate + freteRate;

  const icmsEntradaRate = normalizeRateToDecimal(override?.creditoEntradaICMS ?? globalConfig.creditoEntradaICMS, 0.12);
  const custoFixoRate = normalizeRateToDecimal(override?.custosFixos ?? globalConfig.custosFixos, 0.26);
  const icmsSaidaRate = normalizeRateToDecimal(override?.icmsAliquota ?? globalConfig.icmsAliquota, 0.195);
  const pisCofinsRate = normalizeRateToDecimal(override?.pisCofinsAliquota ?? globalConfig.pisCofinsAliquota, 0.06);

  const despesasPdv = pdv * (custoFixoRate + icmsSaidaRate + pisCofinsRate);
  const custoMaximoPermitido = pdv * (1 - margemDecimal) - despesasPdv;

  const divisorCompra = (1 - icmsEntradaRate) + encargosEntradaRate;
  if (divisorCompra <= 0) return 0;

  const maxCompra = custoMaximoPermitido / divisorCompra;
  return Math.max(0, Number(maxCompra.toFixed(2)));
}
