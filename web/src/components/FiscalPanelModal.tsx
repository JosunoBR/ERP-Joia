import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calculator, 
  ArrowDownRight, 
  ArrowUpRight, 
  RotateCcw, 
  HelpCircle,
  FileSpreadsheet,
  Percent,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Sliders,
  Sparkles,
  Package
} from 'lucide-react';
import { OrderItem, FiscalConfig, OrderItemFiscalOverride } from '../shared/types';
import { calculateItemFiscal, normalizeRateToDecimal, calculateMaxPurchasePrice } from '../shared/fiscalEngine';
import { formatCurrency, handleCurrencyInput } from '../utils/masks';

interface FiscalPanelModalProps {
  item: OrderItem | null;
  globalFiscal: FiscalConfig;
  isOpen: boolean;
  onClose: () => void;
  onApplyChanges: (itemId: string, updatedFields: Partial<OrderItem>) => void;
}

export const FiscalPanelModal: React.FC<FiscalPanelModalProps> = ({
  item,
  globalFiscal,
  isOpen,
  onClose,
  onApplyChanges
}) => {
  if (!isOpen || !item) return null;

  // Preço e PDV deste item
  const [precoCompra, setPrecoCompra] = useState<number>(item.precoUnitario);
  const [pdvAlvo, setPdvAlvo] = useState<number>(item.pdvAlvo || 0);

  // Flag se este item usa configuração fiscal própria
  const hasInitialCustom = Boolean(item.fiscalOverride?.useCustomFiscal);
  const [useCustom, setUseCustom] = useState<boolean>(hasInitialCustom);

  // Alíquotas normalizadas em percentual (0 a 100)
  const [ipiPct, setIpiPct] = useState<number>(() => {
    const val = item.fiscalOverride?.useCustomFiscal && item.fiscalOverride.ipiAliquota !== undefined
      ? item.fiscalOverride.ipiAliquota
      : globalFiscal.ipiAliquota;
    return Number((normalizeRateToDecimal(val, 0) * 100).toFixed(2));
  });

  const [stPct, setStPct] = useState<number>(() => {
    const val = item.fiscalOverride?.useCustomFiscal && item.fiscalOverride.aliquotaSt !== undefined
      ? item.fiscalOverride.aliquotaSt
      : globalFiscal.aliquotaSt;
    return Number((normalizeRateToDecimal(val, 0) * 100).toFixed(2));
  });

  const [fretePct, setFretePct] = useState<number>(() => {
    const val = item.fiscalOverride?.useCustomFiscal && item.fiscalOverride.freteAliquota !== undefined
      ? item.fiscalOverride.freteAliquota
      : globalFiscal.freteAliquota;
    return Number((normalizeRateToDecimal(val, 0) * 100).toFixed(2));
  });

  const [icmsEntradaPct, setIcmsEntradaPct] = useState<number>(() => {
    const val = item.fiscalOverride?.useCustomFiscal && item.fiscalOverride.creditoEntradaICMS !== undefined
      ? item.fiscalOverride.creditoEntradaICMS
      : globalFiscal.creditoEntradaICMS;
    return Number((normalizeRateToDecimal(val, 0.12) * 100).toFixed(2));
  });

  const [custoFixoPct, setCustoFixoPct] = useState<number>(() => {
    const val = item.fiscalOverride?.useCustomFiscal && item.fiscalOverride.custosFixos !== undefined
      ? item.fiscalOverride.custosFixos
      : globalFiscal.custosFixos;
    return Number((normalizeRateToDecimal(val, 0.26) * 100).toFixed(2));
  });

  const [icmsSaidaPct, setIcmsSaidaPct] = useState<number>(() => {
    const val = item.fiscalOverride?.useCustomFiscal && item.fiscalOverride.icmsAliquota !== undefined
      ? item.fiscalOverride.icmsAliquota
      : globalFiscal.icmsAliquota;
    return Number((normalizeRateToDecimal(val, 0.195) * 100).toFixed(2));
  });

  const [pisCofinsPct, setPisCofinsPct] = useState<number>(() => {
    const val = item.fiscalOverride?.useCustomFiscal && item.fiscalOverride.pisCofinsAliquota !== undefined
      ? item.fiscalOverride.pisCofinsAliquota
      : globalFiscal.pisCofinsAliquota;
    return Number((normalizeRateToDecimal(val, 0.06) * 100).toFixed(2));
  });

  // Atualizar valores se o item mudar
  useEffect(() => {
    if (item) {
      setPrecoCompra(item.precoUnitario);
      setPdvAlvo(item.pdvAlvo || 0);
      const isCust = Boolean(item.fiscalOverride?.useCustomFiscal);
      setUseCustom(isCust);

      const fIpi = isCust && item.fiscalOverride?.ipiAliquota !== undefined
        ? item.fiscalOverride.ipiAliquota
        : globalFiscal.ipiAliquota;
      setIpiPct(Number((normalizeRateToDecimal(fIpi, 0) * 100).toFixed(2)));

      const fSt = isCust && item.fiscalOverride?.aliquotaSt !== undefined
        ? item.fiscalOverride.aliquotaSt
        : globalFiscal.aliquotaSt;
      setStPct(Number((normalizeRateToDecimal(fSt, 0) * 100).toFixed(2)));

      const fFrete = isCust && item.fiscalOverride?.freteAliquota !== undefined
        ? item.fiscalOverride.freteAliquota
        : globalFiscal.freteAliquota;
      setFretePct(Number((normalizeRateToDecimal(fFrete, 0) * 100).toFixed(2)));

      const fIcmsEnt = isCust && item.fiscalOverride?.creditoEntradaICMS !== undefined
        ? item.fiscalOverride.creditoEntradaICMS
        : globalFiscal.creditoEntradaICMS;
      setIcmsEntradaPct(Number((normalizeRateToDecimal(fIcmsEnt, 0.12) * 100).toFixed(2)));

      const fCF = isCust && item.fiscalOverride?.custosFixos !== undefined
        ? item.fiscalOverride.custosFixos
        : globalFiscal.custosFixos;
      setCustoFixoPct(Number((normalizeRateToDecimal(fCF, 0.26) * 100).toFixed(2)));

      const fIcmsSai = isCust && item.fiscalOverride?.icmsAliquota !== undefined
        ? item.fiscalOverride.icmsAliquota
        : globalFiscal.icmsAliquota;
      setIcmsSaidaPct(Number((normalizeRateToDecimal(fIcmsSai, 0.195) * 100).toFixed(2)));

      const fPis = isCust && item.fiscalOverride?.pisCofinsAliquota !== undefined
        ? item.fiscalOverride.pisCofinsAliquota
        : globalFiscal.pisCofinsAliquota;
      setPisCofinsPct(Number((normalizeRateToDecimal(fPis, 0.06) * 100).toFixed(2)));
    }
  }, [item?.id, isOpen]);

  // Handler para campos de porcentagem com máscara de 2 casas
  const handleRateInput = (setter: (val: number) => void, rawVal: string) => {
    const { value } = handleCurrencyInput(rawVal);
    setter(value);
    // Ao alterar qualquer valor, ativa automaticamente a personalização deste item
    setUseCustom(true);
  };

  // Objeto de override ativo para cálculo em tempo real
  const currentFiscalOverride: OrderItemFiscalOverride | undefined = useMemo(() => {
    if (!useCustom) return undefined;
    return {
      useCustomFiscal: true,
      ipiAliquota: ipiPct / 100,
      aliquotaSt: stPct / 100,
      freteAliquota: fretePct / 100,
      creditoEntradaICMS: icmsEntradaPct / 100,
      custosFixos: custoFixoPct / 100,
      icmsAliquota: icmsSaidaPct / 100,
      pisCofinsAliquota: pisCofinsPct / 100
    };
  }, [useCustom, ipiPct, stPct, fretePct, icmsEntradaPct, custoFixoPct, icmsSaidaPct, pisCofinsPct]);

  // Preço de compra efetivo considerando desconto comercial se houver
  const descPct = item.percentualDesconto || 0;
  const precoCompraEfetivo = precoCompra * (1 - descPct / 100);

  // Cálculo da Engenharia Fiscal em Tempo Real
  const fiscalResult = useMemo(() => {
    return calculateItemFiscal(precoCompraEfetivo, pdvAlvo, globalFiscal, currentFiscalOverride);
  }, [precoCompraEfetivo, pdvAlvo, globalFiscal, currentFiscalOverride]);

  // Presets
  const applyPreset1 = () => {
    setUseCustom(true);
    setIpiPct(5.00);
    setStPct(18.00);
    setFretePct(3.50);
    setIcmsEntradaPct(12.00);
    setCustoFixoPct(26.00);
    setIcmsSaidaPct(19.00);
    setPisCofinsPct(6.00);
  };

  const applyPreset2 = () => {
    setUseCustom(true);
    setIpiPct(3.50);
    setStPct(0.00);
    setFretePct(0.00);
    setIcmsEntradaPct(4.00);
    setCustoFixoPct(20.00);
    setIcmsSaidaPct(11.00);
    setPisCofinsPct(3.00);
  };

  // Restaurar para os parâmetros gerais do pedido
  const handleResetToOrderGlobal = () => {
    setUseCustom(false);
    setIpiPct(Number((normalizeRateToDecimal(globalFiscal.ipiAliquota, 0) * 100).toFixed(2)));
    setStPct(Number((normalizeRateToDecimal(globalFiscal.aliquotaSt, 0) * 100).toFixed(2)));
    setFretePct(Number((normalizeRateToDecimal(globalFiscal.freteAliquota, 0) * 100).toFixed(2)));
    setIcmsEntradaPct(Number((normalizeRateToDecimal(globalFiscal.creditoEntradaICMS, 0.12) * 100).toFixed(2)));
    setCustoFixoPct(Number((normalizeRateToDecimal(globalFiscal.custosFixos, 0.26) * 100).toFixed(2)));
    setIcmsSaidaPct(Number((normalizeRateToDecimal(globalFiscal.icmsAliquota, 0.195) * 100).toFixed(2)));
    setPisCofinsPct(Number((normalizeRateToDecimal(globalFiscal.pisCofinsAliquota, 0.06) * 100).toFixed(2)));
  };

  // Salvar no item
  const handleSave = () => {
    const valorBruto = precoCompra * item.qtdTotalUnidades;
    const valorDesc = valorBruto * (descPct / 100);
    const valorLiquido = valorBruto - valorDesc;

    onApplyChanges(item.id, {
      precoUnitario: precoCompra,
      pdvAlvo: pdvAlvo,
      valorTotalBruto: valorBruto,
      percentualDesconto: descPct,
      valorDescontoItem: valorDesc,
      valorTotalLiquido: valorLiquido,
      fiscalOverride: useCustom ? currentFiscalOverride : { useCustomFiscal: false },
      custoLoja: fiscalResult.custoLoja,
      custoFornecedor: fiscalResult.custoFornecedor,
      despesasPdvUnit: fiscalResult.despesasPdvUnit,
      creditoIcmsUnit: fiscalResult.creditoIcmsUnit,
      custoRealEfetivo: fiscalResult.custoLoja,
      margemRealUnit: fiscalResult.margemRealUnit,
      margemPercentual: fiscalResult.margemPercentual
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col">
        
        {/* ========================================================= */}
        {/* CABEÇALHO DO MODAL */}
        {/* ========================================================= */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20 shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Engenharia Fiscal Individual deste Produto
                </h3>
                {useCustom ? (
                  <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/50">
                    Regra Individual Ativa
                  </span>
                ) : (
                  <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    Usando Padrão do Pedido
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xl font-medium mt-0.5">
                {item.descricao || 'Produto sem descrição'} {item.codigoInterno ? `• Cód: ${item.codigoInterno}` : ''} {item.codigoBarras ? `• EAN: ${item.codigoBarras}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar calculadora"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* CORPO DO MODAL */}
        {/* ========================================================= */}
        <div className="p-5 sm:p-6 space-y-6">

          {/* BARRA DE PREÇO, PDV E PRESETS */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Inputs de Preço e PDV do item */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Preço Compra (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precoCompra === 0 ? '' : precoCompra}
                    placeholder="0.00"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setPrecoCompra(parseFloat(e.target.value) || 0)}
                    className="w-28 pl-8 pr-2 py-1.5 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                  PDV Alvo (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-blue-500 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={pdvAlvo === 0 ? '' : pdvAlvo}
                    placeholder="0.00"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setPdvAlvo(parseFloat(e.target.value) || 0)}
                    className="w-28 pl-8 pr-2 py-1.5 text-sm font-bold rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="hidden lg:block h-9 border-r border-slate-200 dark:border-slate-700 mx-1"></div>

              {/* Indicadores rápidos */}
              <div className="text-xs space-y-0.5">
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Custo Loja: <strong className="text-blue-600 dark:text-blue-400 font-mono">R$ {fiscalResult.custoLoja.toFixed(2)}</strong>
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Custo Fornecedor: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">R$ {fiscalResult.custoFornecedor.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">Simular:</span>
              <button
                type="button"
                onClick={applyPreset1}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition cursor-pointer"
                title="IPI 5%, ST 18%, Frete 3.5%, CF 26%, ICMS 19%"
              >
                📊 Simulação 1 (ST 18%)
              </button>
              <button
                type="button"
                onClick={applyPreset2}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition cursor-pointer"
                title="IPI 3.5%, ST 0%, Frete 0%, CF 20%, ICMS 11%"
              >
                📊 Simulação 2 (ST 0%)
              </button>
              <button
                type="button"
                onClick={handleResetToOrderGlobal}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
                title="Redefinir taxas para os padrões do pedido"
              >
                <RotateCcw className="w-3 h-3" />
                Padrão Pedido
              </button>
            </div>
          </div>

          {/* GRID DE DUAS PARTES (EXATAMENTE COMO NO CARD DO PEDIDO E PLANILHA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ========================================================= */}
            {/* PARTE 1: IMPOSTOS + CUSTOS DE ENTRADA (Custo Real Fornecedor) */}
            {/* ========================================================= */}
            <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/10 p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/40">
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    1. CUSTO REAL FORNECEDOR (ENTRADA)
                  </h4>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-medium">
                    Valor do item acrescenta IPI, ST e Frete específicos deste item
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-300/40 font-mono">
                  +{(ipiPct + stPct + fretePct).toFixed(2)}%
                </span>
              </div>

              {/* INPUTS DE ENTRADA */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    IPI (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={ipiPct > 0 ? ipiPct.toFixed(2).replace('.', ',') : '0,00'}
                      onChange={(e) => handleRateInput(setIpiPct, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ST (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={stPct > 0 ? stPct.toFixed(2).replace('.', ',') : '0,00'}
                      onChange={(e) => handleRateInput(setStPct, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    FRETE (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fretePct > 0 ? fretePct.toFixed(2).replace('.', ',') : '0,00'}
                      onChange={(e) => handleRateInput(setFretePct, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {/* SIMULAÇÃO AO VIVO DA ENTRADA DESTE PRODUTO */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-emerald-200/60 dark:border-emerald-800/40 text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <span>CÁLCULO DE ENTRADA DO PRODUTO</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    R$ {precoCompraEfetivo.toFixed(2)} / un
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>IPI ({ipiPct.toFixed(2)}%)</span>
                  <span>{precoCompraEfetivo.toFixed(2)} × {ipiPct}%</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {fiscalResult.ipiUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ST ({stPct.toFixed(2)}%)</span>
                  <span>{precoCompraEfetivo.toFixed(2)} × {stPct}%</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {fiscalResult.stUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>FRETE ({fretePct.toFixed(2)}%)</span>
                  <span>{precoCompraEfetivo.toFixed(2)} × {fretePct}%</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {fiscalResult.freteUnit.toFixed(2)}</strong>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
                  <span className="text-emerald-900 dark:text-emerald-300">ENCARGOS DE ENTRADA:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    R$ {fiscalResult.custoRealEntrada.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Custo Fornecedor (Produto + Encargos):</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    R$ {fiscalResult.custoFornecedor.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* PARTE 2: IMPOSTOS + CUSTOS DE SAÍDA (Custo Loja) */}
            {/* ========================================================= */}
            <div className="rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/10 p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/60 dark:border-blue-800/40">
                <div>
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
                    2. FORMAÇÃO DO CUSTO LOJA (CUSTO & MARGEM)
                  </h4>
                  <p className="text-[10px] text-blue-700/80 dark:text-blue-400 font-medium">
                    Desconta ICMS Entrada do produto e soma custos incidentes sobre o PDV
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md border border-blue-300/40 font-mono">
                  Custos s/ PDV: {(custoFixoPct + icmsSaidaPct + pisCofinsPct).toFixed(2)}%
                </span>
              </div>

              {/* INPUTS DE SAÍDA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1" title="Crédito de ICMS de Entrada a descontar do produto">
                    ICMS Entrada (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={icmsEntradaPct > 0 ? icmsEntradaPct.toFixed(2).replace('.', ',') : '0,00'}
                      onChange={(e) => handleRateInput(setIcmsEntradaPct, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Desconta do item
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1" title="Custo fixo proporcional multiplicado por PDV">
                    Custo Fixo (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={custoFixoPct > 0 ? custoFixoPct.toFixed(2).replace('.', ',') : '0,00'}
                      onChange={(e) => handleRateInput(setCustoFixoPct, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    s/ PDV
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1" title="ICMS de Saída na ponta multiplicado por PDV">
                    ICMS Saída (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={icmsSaidaPct > 0 ? icmsSaidaPct.toFixed(2).replace('.', ',') : '0,00'}
                      onChange={(e) => handleRateInput(setIcmsSaidaPct, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    s/ PDV
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1" title="PIS, COFINS, IR multiplicado por PDV">
                    PIS/COF/IR (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pisCofinsPct > 0 ? pisCofinsPct.toFixed(2).replace('.', ',') : '0,00'}
                      onChange={(e) => handleRateInput(setPisCofinsPct, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    s/ PDV
                  </p>
                </div>
              </div>

              {/* SIMULAÇÃO AO VIVO DA SAÍDA */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-blue-200/60 dark:border-blue-800/40 text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <span>FORMAÇÃO DO CUSTO LOJA</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    PDV R$ {pdvAlvo.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ICMS ENTRADA ({icmsEntradaPct.toFixed(2)}%)</span>
                  <span>{precoCompraEfetivo.toFixed(2)} - {icmsEntradaPct}%</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {fiscalResult.baseIcmsEntrada.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>CUSTO FIXO ({custoFixoPct.toFixed(2)}%)</span>
                  <span>{pdvAlvo.toFixed(2)} × {custoFixoPct}%</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {fiscalResult.custoFixoUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ENCARGOS ENTRADA (IPI+ST+Frete)</span>
                  <span>da Parte 1</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {fiscalResult.custoRealEntrada.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ICMS SAÍDA ({icmsSaidaPct.toFixed(2)}%)</span>
                  <span>{pdvAlvo.toFixed(2)} × {icmsSaidaPct}%</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {fiscalResult.icmsSaidaUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>PIS, COFINS, IR ({pisCofinsPct.toFixed(2)}%)</span>
                  <span>{pdvAlvo.toFixed(2)} × {pisCofinsPct}%</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {fiscalResult.pisCofinsUnit.toFixed(2)}</strong>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
                  <span className="text-blue-900 dark:text-blue-300">TOTAL CUSTO LOJA:</span>
                  <span className="text-blue-700 dark:text-blue-400 font-mono text-sm">
                    R$ {fiscalResult.custoLoja.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Margem Real Unitária:</span>
                  <span className={`font-mono font-bold ${fiscalResult.margemPercentual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {fiscalResult.margemPercentual.toFixed(2)}% ({formatCurrency(fiscalResult.margemRealUnit, true)})
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* STATUS DE VIABILIDADE / ALERTA DE MARGEM */}
          <div className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs ${
            fiscalResult.statusMargem === 'excelente'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : fiscalResult.statusMargem === 'boa'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
              : fiscalResult.statusMargem === 'apertada'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}>
            {fiscalResult.isLucrativo ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <div className="flex-1">
              <span className="font-bold">
                {fiscalResult.isLucrativo
                  ? `Margem de Lucro Positiva: ${fiscalResult.margemPercentual.toFixed(1)}% (${formatCurrency(fiscalResult.margemRealUnit, true)}/un)`
                  : `Atenção: Margem Negativa de ${fiscalResult.margemPercentual.toFixed(1)}% (${formatCurrency(fiscalResult.margemRealUnit, true)}/un)`}
              </span>
              <p className="text-[11px] opacity-90 mt-0.5">
                {fiscalResult.isLucrativo
                  ? 'Este item cobre todos os impostos de entrada, custos fixos, ICMS saída e PIS/COFINS com lucro garantido.'
                  : 'O custo total da loja é superior ao PDV pretendido. Considere negociar um preço de compra menor ou ajustar o PDV.'}
              </p>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RODAPÉ DO MODAL */}
        {/* ========================================================= */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 sticky bottom-0 z-20">
          <button
            type="button"
            onClick={handleResetToOrderGlobal}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Voltar aos Padrões do Pedido
          </button>
          
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5" />
              Salvar Alterações deste Produto
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
