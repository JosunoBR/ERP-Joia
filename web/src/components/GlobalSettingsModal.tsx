import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Store, 
  Calculator, 
  RotateCcw, 
  Check, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { FiscalConfig, StoreConfig } from '../shared/types';
import { DEFAULT_FISCAL_CONFIG, DEFAULT_STORES } from '../shared/constants';

interface GlobalSettingsModalProps {
  fiscalConfig: FiscalConfig;
  storeConfigs: StoreConfig[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (fiscal: FiscalConfig, stores: StoreConfig[]) => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
  fiscalConfig,
  storeConfigs,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'fiscal' | 'stores'>('fiscal');

  // Fiscal state
  const [icms, setIcms] = useState(fiscalConfig.icmsAliquota * 100);
  const [ipi, setIpi] = useState(fiscalConfig.ipiAliquota * 100);
  const [pisCofins, setPisCofins] = useState(fiscalConfig.pisCofinsAliquota * 100);
  const [custosFixos, setCustosFixos] = useState(fiscalConfig.custosFixos * 100);
  const [creditoEntrada, setCreditoEntrada] = useState(fiscalConfig.creditoEntradaICMS * 100);

  // Stores state
  const [stores, setStores] = useState<StoreConfig[]>([...storeConfigs]);

  const handleSave = () => {
    const updatedFiscal: FiscalConfig = {
      icmsAliquota: icms / 100,
      ipiAliquota: ipi / 100,
      pisCofinsAliquota: pisCofins / 100,
      custosFixos: custosFixos / 100,
      creditoEntradaICMS: creditoEntrada / 100
    };
    onSave(updatedFiscal, stores);
    onClose();
  };

  const handleResetFiscalDefaults = () => {
    setIcms(DEFAULT_FISCAL_CONFIG.icmsAliquota * 100);
    setIpi(DEFAULT_FISCAL_CONFIG.ipiAliquota * 100);
    setPisCofins(DEFAULT_FISCAL_CONFIG.pisCofinsAliquota * 100);
    setCustosFixos(DEFAULT_FISCAL_CONFIG.custosFixos * 100);
    setCreditoEntrada(DEFAULT_FISCAL_CONFIG.creditoEntradaICMS * 100);
  };

  const handleResetStoresDefaults = () => {
    setStores([...DEFAULT_STORES]);
  };

  const handleToggleStore = (storeId: string) => {
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, active: !s.active } : s));
  };

  const handleStoreWeightChange = (storeId: string, weight: number) => {
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, defaultWeight: weight } : s));
  };

  const totalDespesas = icms + ipi + pisCofins + custosFixos;
  const totalPontosAtivos = stores.filter(s => s.active).reduce((a, b) => a + b.defaultWeight, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Configurações & Parâmetros da Rede
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Padrões automáticos para novas cotações e rateios de separação
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={() => setActiveTab('fiscal')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'fiscal'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Engenharia Fiscal Padrão (40% / 19.5%)
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'stores'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Store className="w-4 h-4" />
            Lojas & Pesos de Rateio (39 Pontos)
          </button>
        </div>

        {/* Tab 1: Fiscal */}
        {activeTab === 'fiscal' && (
          <div className="p-6 space-y-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                Fórmula de Formação do Custo Real Efetivo
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                Custo Real = Compra + (PDV × % Despesas PDV) - (Compra × % Crédito ICMS)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Composição das Despesas PDV ({totalDespesas.toFixed(1)}%)
                </h4>
                
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    ICMS Saída (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={icms === 0 ? '' : icms}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setIcms(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    PIS / COFINS (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pisCofins === 0 ? '' : pisCofins}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setPisCofins(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    Custos Fixos da Loja (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={custosFixos === 0 ? '' : custosFixos}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCustosFixos(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    IPI Saída (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={ipi === 0 ? '' : ipi}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setIpi(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Créditos Tributários de Entrada
                </h4>

                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                  <label className="block text-xs text-emerald-900 dark:text-emerald-300 font-bold mb-1">
                    Crédito de Entrada ICMS (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={creditoEntrada === 0 ? '' : creditoEntrada}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCreditoEntrada(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-base rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-extrabold"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Abatimento direto do ICMS creditado na compra do produto (padrão 19,5%).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Stores */}
        {activeTab === 'stores' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Rede de 20 Lojas • Total Percentual Ativo: <strong className="text-emerald-600">{totalPontosAtivos.toFixed(1)}%</strong>
              </span>
              <button
                onClick={handleResetStoresDefaults}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar Padrão 100%
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {stores.map(store => (
                <div 
                  key={store.id} 
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    store.active 
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700' 
                      : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={store.active}
                      onChange={() => handleToggleStore(store.id)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {store.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Cluster {store.cluster}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Rateio:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="100"
                      value={store.defaultWeight}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleStoreWeightChange(store.id, parseFloat(e.target.value) || 1)}
                      className="w-16 px-2 py-1 text-xs text-center font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 sticky bottom-0">
          <button
            onClick={activeTab === 'fiscal' ? handleResetFiscalDefaults : handleResetStoresDefaults}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Valores Padrões
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Salvar Configurações
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
