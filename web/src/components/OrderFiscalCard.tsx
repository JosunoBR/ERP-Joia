import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  ArrowDownRight, 
  ArrowUpRight, 
  RotateCcw, 
  HelpCircle,
  FileSpreadsheet,
  Percent,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Bookmark,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { FiscalConfig, FiscalPreset } from '../shared/types';
import { DEFAULT_FISCAL_CONFIG, DEFAULT_FISCAL_PRESETS } from '../shared/constants';
import { calculateItemFiscal, normalizeRateToDecimal } from '../shared/fiscalEngine';
import { formatCurrency, handleCurrencyInput, handleOneDecimalInput } from '../utils/masks';

interface OrderFiscalCardProps {
  fiscalConfig: FiscalConfig;
  onChangeFiscalConfig: (newConfig: FiscalConfig) => void;
  aliquotaStHeader?: number;
  onUpdateHeaderSt?: (newSt: number) => void;
  valorFreteHeader?: number;
  onUpdateHeaderFrete?: (newFrete: number) => void;
  totalMercadorias?: number;
  averageItemPrice?: number;
  samplePdv?: number;
  fiscalPresets?: FiscalPreset[];
  onSaveFiscalPreset?: (preset: FiscalPreset) => Promise<any> | void;
  onDeleteFiscalPreset?: (presetId: string) => Promise<any> | void;
}

export const OrderFiscalCard: React.FC<OrderFiscalCardProps> = ({
  fiscalConfig,
  onChangeFiscalConfig,
  aliquotaStHeader,
  onUpdateHeaderSt,
  valorFreteHeader,
  onUpdateHeaderFrete,
  totalMercadorias = 0,
  averageItemPrice = 7.00,
  samplePdv = 12.00,
  fiscalPresets = [],
  onSaveFiscalPreset,
  onDeleteFiscalPreset
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [simPreco, setSimPreco] = useState<number>(averageItemPrice > 0 ? averageItemPrice : 7.00);
  const [simPdv, setSimPdv] = useState<number>(samplePdv > 0 ? samplePdv : 12.00);

  // Normalização das alíquotas ativas em percentual com 1 casa decimal (0 a 100)
  const ipiPct = Number(((normalizeRateToDecimal(fiscalConfig.ipiAliquota, 0)) * 100).toFixed(1));
  const stPct = Number(((normalizeRateToDecimal(fiscalConfig.aliquotaSt !== undefined ? fiscalConfig.aliquotaSt : aliquotaStHeader, 0)) * 100).toFixed(1));
  const fretePct = Number(((normalizeRateToDecimal(fiscalConfig.freteAliquota, 0)) * 100).toFixed(1));

  const icmsEntradaPct = Number(((normalizeRateToDecimal(fiscalConfig.creditoEntradaICMS, 0.12)) * 100).toFixed(1));
  const custoFixoPct = Number(((normalizeRateToDecimal(fiscalConfig.custosFixos, 0.26)) * 100).toFixed(1));
  const icmsSaidaPct = Number(((normalizeRateToDecimal(fiscalConfig.icmsAliquota, 0.195)) * 100).toFixed(1));
  const pisCofinsPct = Number(((normalizeRateToDecimal(fiscalConfig.pisCofinsAliquota, 0.06)) * 100).toFixed(1));

  // Valor em R$ calculado do frete a partir da alíquota e do total de mercadorias
  const freteValorCalculado = valorFreteHeader !== undefined && valorFreteHeader > 0
    ? valorFreteHeader
    : (totalMercadorias > 0 && fretePct > 0 ? Number((totalMercadorias * (fretePct / 100)).toFixed(2)) : 0);

  // Controle de edição com limpeza instantânea ao clicar/focar
  const [activeField, setActiveField] = useState<string | null>(null);
  const [activeInputText, setActiveInputText] = useState<string>('');
  const [presetInputValue, setPresetInputValue] = useState<string>('Padrão Rede (Supermercado)');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);

  const [activeSimPreco, setActiveSimPreco] = useState(false);
  const [tempSimPreco, setTempSimPreco] = useState('');

  const handleFieldFocus = (fieldKey: string) => {
    setActiveField(fieldKey);
    setActiveInputText(''); // Limpa a caixa de texto ao clicar/focar para digitar livremente
  };

  const handleFieldBlur = () => {
    setActiveField(null);
    setActiveInputText('');
  };

  const handleFieldInputChange = (
    field: keyof FiscalConfig,
    rawText: string,
    isST: boolean = false
  ) => {
    // Permite digitação livre de números, vírgula e ponto
    const sanitized = rawText.replace(/[^0-9,\.]/g, '');
    setActiveInputText(sanitized);

    const parsedNum = parseFloat(sanitized.replace(',', '.')) || 0;
    const decimalValue = Number((parsedNum / 100).toFixed(4));

    const updated: FiscalConfig = {
      ...fiscalConfig,
      [field]: decimalValue
    };

    if (isST) {
      updated.aliquotaSt = decimalValue;
    }

    onChangeFiscalConfig(updated);
  };

  const getDisplayValue = (fieldKey: string, currentPct: number) => {
    if (activeField === fieldKey) {
      return activeInputText;
    }
    return currentPct > 0 ? currentPct.toFixed(1).replace('.', ',') : '0,0';
  };

  const handleSimPrecoFocus = () => {
    setActiveSimPreco(true);
    setTempSimPreco(''); // Limpa o campo de simulação ao clicar
  };

  const handleSimPrecoChange = (raw: string) => {
    const sanitized = raw.replace(/[^0-9,\.]/g, '');
    setTempSimPreco(sanitized);
    const parsed = parseFloat(sanitized.replace(',', '.')) || 0;
    setSimPreco(parsed);
  };

  const handleSimPrecoBlur = () => {
    setActiveSimPreco(false);
    setTempSimPreco('');
  };

  // Cálculo da simulação em tempo real
  const simResult = useMemo(() => {
    return calculateItemFiscal(simPreco, simPdv, fiscalConfig);
  }, [simPreco, simPdv, fiscalConfig]);

  // Lista de modelos fiscais disponíveis (mescla defaults com os do banco)
  const presetsList = useMemo(() => {
    if (fiscalPresets && fiscalPresets.length > 0) return fiscalPresets;
    return DEFAULT_FISCAL_PRESETS;
  }, [fiscalPresets]);

  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset_fiscal_padrao');
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Sincroniza o valor do campo com o nome do modelo selecionado
  useEffect(() => {
    const cur = presetsList.find(p => p.id === selectedPresetId);
    if (cur && !isPresetDropdownOpen && (!presetInputValue || presetInputValue === '')) {
      setPresetInputValue(cur.name);
    }
  }, [presetsList, selectedPresetId, isPresetDropdownOpen]);

  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setActionFeedback({ text, type });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Ao focar/clicar no campo do dropdown, limpa o texto para digitar livremente e abre as opções
  const handlePresetInputFocus = () => {
    setPresetInputValue('');
    setIsPresetDropdownOpen(true);
  };

  // Ao perder o foco, se o campo estiver vazio, restaura o nome do modelo ativo
  const handlePresetInputBlur = () => {
    setTimeout(() => {
      if (!presetInputValue.trim()) {
        const cur = presetsList.find(p => p.id === selectedPresetId) || presetsList[0];
        if (cur) {
          setPresetInputValue(cur.name);
        }
      }
    }, 250);
  };

  // Aplicar modelo fiscal ao pedido atual
  const handleApplyPreset = (targetPreset: FiscalPreset) => {
    const updated: FiscalConfig = {
      ipiAliquota: normalizeRateToDecimal(targetPreset.ipiAliquota, 0),
      aliquotaSt: normalizeRateToDecimal(targetPreset.aliquotaSt, 0),
      freteAliquota: normalizeRateToDecimal(targetPreset.freteAliquota, 0),
      creditoEntradaICMS: normalizeRateToDecimal(targetPreset.creditoEntradaICMS, 0.12),
      custosFixos: normalizeRateToDecimal(targetPreset.custosFixos, 0.26),
      icmsAliquota: normalizeRateToDecimal(targetPreset.icmsAliquota, 0.195),
      pisCofinsAliquota: normalizeRateToDecimal(targetPreset.pisCofinsAliquota, 0.06)
    };

    // Aplica diretamente todas as alíquotas ao pedido
    onChangeFiscalConfig(updated);

    setSelectedPresetId(targetPreset.id);
    setPresetInputValue(targetPreset.name);
    setIsPresetDropdownOpen(false);
    setActiveField(null);
    setActiveInputText('');
    showFeedback(`Modelo fiscal "${targetPreset.name}" aplicado ao pedido!`, 'success');
  };

  // Salvar alíquotas atualmente configuradas diretamente pelo nome digitado no campo
  const handleSaveCurrentPreset = async () => {
    const name = presetInputValue.trim();
    if (!name) {
      showFeedback('Por favor, digite um nome para o modelo fiscal antes de salvar.', 'error');
      return;
    }
    if (!onSaveFiscalPreset) return;

    const existingPreset = presetsList.find(p => p.name.trim().toLowerCase() === name.toLowerCase());

    const newPreset: FiscalPreset = {
      id: existingPreset ? existingPreset.id : ('preset_fisc_' + Date.now()),
      name,
      description: `IPI ${ipiPct}% • ST ${stPct}% • Frete ${fretePct}% • CF ${custoFixoPct}% • ICMS ${icmsSaidaPct}%`,
      ipiAliquota: normalizeRateToDecimal(fiscalConfig.ipiAliquota, 0),
      aliquotaSt: normalizeRateToDecimal(fiscalConfig.aliquotaSt !== undefined ? fiscalConfig.aliquotaSt : aliquotaStHeader, 0),
      freteAliquota: normalizeRateToDecimal(fiscalConfig.freteAliquota, 0),
      creditoEntradaICMS: normalizeRateToDecimal(fiscalConfig.creditoEntradaICMS, 0.12),
      custosFixos: normalizeRateToDecimal(fiscalConfig.custosFixos, 0.26),
      icmsAliquota: normalizeRateToDecimal(fiscalConfig.icmsAliquota, 0.195),
      pisCofinsAliquota: normalizeRateToDecimal(fiscalConfig.pisCofinsAliquota, 0.06),
      isDefault: existingPreset ? existingPreset.isDefault : false,
      createdAt: existingPreset ? existingPreset.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await onSaveFiscalPreset(newPreset);
      setSelectedPresetId(newPreset.id);
      setPresetInputValue(newPreset.name);
      setIsPresetDropdownOpen(false);
      showFeedback(`⭐ Modelo fiscal "${newPreset.name}" salvo com sucesso!`, 'success');
    } catch (err: any) {
      showFeedback(`Erro ao salvar modelo: ${err.message}`, 'error');
    }
  };

  // Excluir modelo específico direto
  const handleDeletePresetDirect = async (presetId: string, presetName: string) => {
    if (!onDeleteFiscalPreset) return;
    if (!window.confirm(`Tem certeza que deseja excluir o modelo fiscal "${presetName}"?`)) return;

    try {
      await onDeleteFiscalPreset(presetId);
      const defaultP = presetsList.find(p => p.isDefault && p.id !== presetId) || presetsList.find(p => p.id !== presetId) || presetsList[0];
      if (defaultP) {
        setSelectedPresetId(defaultP.id);
        setPresetInputValue(defaultP.name);
        handleApplyPreset(defaultP);
      }
      showFeedback(`Modelo fiscal "${presetName}" excluído com sucesso.`, 'info');
    } catch (err: any) {
      showFeedback(`Erro ao excluir modelo: ${err.message}`, 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs mb-6 overflow-hidden transition-all">
      {/* CABEÇALHO RETRÁTIL DO CARD */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition cursor-pointer text-left select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Engenharia Fiscal & Margem do Pedido
              </span>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200/50">
                Individual por Pedido
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Personalize IPI, ST, Frete, ICMS Entrada/Saída, Custo Fixo e PIS/COFINS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60">
              Encargos Entrada: +{(ipiPct + stPct + fretePct).toFixed(1)}%
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60">
              Custos s/ PDV: {(icmsSaidaPct + custoFixoPct + pisCofinsPct).toFixed(1)}%
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 font-bold text-slate-800 dark:text-slate-200">
              Custo Loja: {formatCurrency(simResult.custoLoja)}
            </span>
          </div>

          <div className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* CONTEÚDO EXPANDIDO: DUAS PARTES (ENTRADA E SAÍDA) */}
      {isOpen && (
        <div className="p-5 border-t border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-800 space-y-4 animate-in fade-in duration-200">
          
          {/* BARRA DE FEEDBACK DE AÇÃO */}
          {actionFeedback && (
            <div className={`p-3 px-4 rounded-xl border flex items-center justify-between text-xs font-bold shadow-xs animate-in fade-in duration-200 ${
              actionFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200' 
                : actionFeedback.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
                : 'bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-200'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{actionFeedback.text}</span>
              </div>
              <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* BARRA DE MODELOS & PRESETS FISCAIS */}
          <div className="bg-slate-50/90 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            
            {/* Esquerda: Ícone, Título e Contador de Modelos */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    MODELOS FISCAIS
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {presetsList.length} {presetsList.length === 1 ? 'modelo' : 'modelos'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Configure as alíquotas e salve modelos reutilizáveis no banco de dados
                </p>
              </div>
            </div>

            {/* Direita: Seletor de Modelo Único (Combobox), Aplicar e Salvar */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Modelo:
              </label>

              <div className="relative min-w-[220px] sm:w-64">
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500">
                  <input
                    type="text"
                    value={presetInputValue}
                    onFocus={handlePresetInputFocus}
                    onClick={handlePresetInputFocus}
                    onBlur={handlePresetInputBlur}
                    onChange={(e) => {
                      setPresetInputValue(e.target.value);
                      setIsPresetDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && presetInputValue.trim()) {
                        e.preventDefault();
                        handleSaveCurrentPreset();
                      }
                    }}
                    placeholder="Nome do modelo..."
                    className="w-full text-xs font-bold px-3 py-1.5 bg-transparent text-slate-900 dark:text-white outline-hidden truncate cursor-text"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 transition cursor-pointer shrink-0"
                    title="Ver opções de modelos"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isPresetDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Dropdown de Modelos com Opção de Aplicar e Excluir */}
                {isPresetDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsPresetDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl z-30 max-h-60 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800">
                      {presetsList.map(p => (
                        <div
                          key={p.id}
                          className={`px-3 py-2 text-xs font-bold flex items-center justify-between transition ${
                            selectedPresetId === p.id 
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleApplyPreset(p);
                            }}
                            className="flex-1 truncate cursor-pointer mr-2"
                            title="Clique para aplicar este modelo"
                          >
                            <span>{p.isDefault ? `⭐ ${p.name}` : p.name}</span>
                            {p.description && (
                              <span className="block text-[10px] font-normal text-slate-400 truncate">
                                {p.description}
                              </span>
                            )}
                          </div>

                          {p.isDefault ? (
                            <span className="text-[10px] text-amber-500 font-extrabold ml-2 shrink-0 select-none">
                              Padrão
                            </span>
                          ) : (
                            onDeleteFiscalPreset && (
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleDeletePresetDirect(p.id, p.name);
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer shrink-0 ml-1"
                                title={`Excluir modelo "${p.name}"`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>


              {/* Botão Salvar (Salva diretamente com o nome do campo) */}
              {onSaveFiscalPreset && (
                <button
                  type="button"
                  onClick={handleSaveCurrentPreset}
                  disabled={!presetInputValue.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50 shadow-xs"
                  title="Salvar alíquotas configuradas com o nome digitado no campo"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>
              )}
            </div>
          </div>

          {/* GRID DE DUAS PARTES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ========================================================= */}
            {/* PARTE 1: IMPOSTOS + CUSTOS DE ENTRADA (Custo Real Fornecedor) */}
            {/* ========================================================= */}
            <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/10 p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/40">
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    1. CUSTO REAL FORNECEDOR (ENTRADA)
                  </h4>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-medium">
                    Valor do item acrescenta IPI, ST e Frete (Desembolso Compra / Boletos)
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-300/40">
                  Encargos: +{(ipiPct + stPct + fretePct).toFixed(1)}%
                </span>
              </div>

              {/* INPUTS DE ENTRADA (Limpam automaticamente ao clicar) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    IPI (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={getDisplayValue('ipiAliquota', ipiPct)}
                      onFocus={() => handleFieldFocus('ipiAliquota')}
                      onClick={() => handleFieldFocus('ipiAliquota')}
                      onBlur={handleFieldBlur}
                      onChange={(e) => handleFieldInputChange('ipiAliquota', e.target.value)}
                      placeholder="0,0"
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
                      value={getDisplayValue('aliquotaSt', stPct)}
                      onFocus={() => handleFieldFocus('aliquotaSt')}
                      onClick={() => handleFieldFocus('aliquotaSt')}
                      onBlur={handleFieldBlur}
                      onChange={(e) => handleFieldInputChange('aliquotaSt', e.target.value, true)}
                      placeholder="0,0"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      FRETE (%)
                    </label>
                    {freteValorCalculado > 0 && (
                      <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
                        = R$ {freteValorCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={getDisplayValue('freteAliquota', fretePct)}
                      onFocus={() => handleFieldFocus('freteAliquota')}
                      onClick={() => handleFieldFocus('freteAliquota')}
                      onBlur={handleFieldBlur}
                      onChange={(e) => handleFieldInputChange('freteAliquota', e.target.value)}
                      placeholder="0,0"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Gera boleto frete 10d após entrega
                  </p>
                </div>
              </div>

              {/* SIMULAÇÃO AO VIVO DA ENTRADA */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-emerald-200/60 dark:border-emerald-800/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <span>SIMULAÇÃO ENTRADA</span>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-slate-500">VALOR PRODUTO:</span>
                    <input
                      type="text"
                      value={activeSimPreco ? tempSimPreco : (simPreco > 0 ? simPreco.toFixed(2).replace('.', ',') : '0,00')}
                      onFocus={handleSimPrecoFocus}
                      onClick={handleSimPrecoFocus}
                      onBlur={handleSimPrecoBlur}
                      onChange={(e) => handleSimPrecoChange(e.target.value)}
                      placeholder="0,00"
                      className="w-16 px-1 py-0.5 text-right font-bold text-emerald-600 bg-slate-50 dark:bg-slate-800 border rounded outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>IPI</span>
                  <span>{ipiPct.toFixed(1)}% ({simPreco.toFixed(2)} × {ipiPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.ipiUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ST</span>
                  <span>{stPct.toFixed(1)}% ({simPreco.toFixed(2)} × {stPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.stUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>FRETE</span>
                  <span>{fretePct.toFixed(1)}% ({simPreco.toFixed(2)} × {fretePct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.freteUnit.toFixed(2)}</strong>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
                  <span className="text-emerald-900 dark:text-emerald-300">TOTAL CUSTO REAL (ENCARGOS):</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    R$ {simResult.custoRealEntrada.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Custo Fornecedor (Produto + Encargos):</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    R$ {simResult.custoFornecedor.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* PARTE 2: IMPOSTOS + CUSTOS DE SAÍDA (Custo Loja) */}
            {/* ========================================================= */}
            <div className="rounded-xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/10 p-4 space-y-4">
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
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md border border-blue-300/40">
                  Custos s/ PDV: {(custoFixoPct + icmsSaidaPct + pisCofinsPct).toFixed(1)}%
                </span>
              </div>

              {/* INPUTS DE SAÍDA (Limpam automaticamente ao clicar) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1" title="Crédito de ICMS de Entrada a descontar do produto">
                    ICMS Entrada (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={getDisplayValue('creditoEntradaICMS', icmsEntradaPct)}
                      onFocus={() => handleFieldFocus('creditoEntradaICMS')}
                      onClick={() => handleFieldFocus('creditoEntradaICMS')}
                      onBlur={handleFieldBlur}
                      onChange={(e) => handleFieldInputChange('creditoEntradaICMS', e.target.value)}
                      placeholder="0,0"
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
                      value={getDisplayValue('custosFixos', custoFixoPct)}
                      onFocus={() => handleFieldFocus('custosFixos')}
                      onClick={() => handleFieldFocus('custosFixos')}
                      onBlur={handleFieldBlur}
                      onChange={(e) => handleFieldInputChange('custosFixos', e.target.value)}
                      placeholder="0,0"
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
                      value={getDisplayValue('icmsAliquota', icmsSaidaPct)}
                      onFocus={() => handleFieldFocus('icmsAliquota')}
                      onClick={() => handleFieldFocus('icmsAliquota')}
                      onBlur={handleFieldBlur}
                      onChange={(e) => handleFieldInputChange('icmsAliquota', e.target.value)}
                      placeholder="0,0"
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
                      value={getDisplayValue('pisCofinsAliquota', pisCofinsPct)}
                      onFocus={() => handleFieldFocus('pisCofinsAliquota')}
                      onClick={() => handleFieldFocus('pisCofinsAliquota')}
                      onBlur={handleFieldBlur}
                      onChange={(e) => handleFieldInputChange('pisCofinsAliquota', e.target.value)}
                      placeholder="0,0"
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
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-blue-200/60 dark:border-blue-800/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <span>SIMULAÇÃO CUSTO LOJA</span>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-slate-500">PDV ALVO:</span>
                    <input
                      type="number"
                      step="0.50"
                      value={simPdv}
                      onChange={(e) => setSimPdv(parseFloat(e.target.value) || 0)}
                      className="w-16 px-1 py-0.5 text-right font-bold text-blue-600 bg-slate-50 dark:bg-slate-800 border rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ICMS ENTRADA</span>
                  <span>{icmsEntradaPct.toFixed(1)}% ({simPreco.toFixed(2)} - {icmsEntradaPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.baseIcmsEntrada.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>CUSTO FIXO</span>
                  <span>{custoFixoPct.toFixed(1)}% ({simPdv.toFixed(2)} × {custoFixoPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.custoFixoUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>CUSTO REAL (ENCARGOS ENTRADA)</span>
                  <span>(IPI + ST + Frete da Parte 1)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.custoRealEntrada.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ICMS SAÍDA</span>
                  <span>{icmsSaidaPct.toFixed(1)}% ({simPdv.toFixed(2)} × {icmsSaidaPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.icmsSaidaUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>PIS, COFINS, IR</span>
                  <span>{pisCofinsPct.toFixed(1)}% ({simPdv.toFixed(2)} × {pisCofinsPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.pisCofinsUnit.toFixed(2)}</strong>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
                  <span className="text-blue-900 dark:text-blue-300">TOTAL CUSTO LOJA:</span>
                  <span className="text-blue-700 dark:text-blue-400 font-mono text-sm">
                    R$ {simResult.custoLoja.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Margem Real Estimada:</span>
                  <span className={`font-mono font-bold ${simResult.margemPercentual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {simResult.margemPercentual.toFixed(1)}% ({formatCurrency(simResult.margemRealUnit, true)})
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
