import React, { useState } from 'react';
import { 
  PackageCheck, 
  Store, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Truck, 
  ChevronRight, 
  Boxes,
  ShieldAlert,
  Search,
  Check,
  Save,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { PurchaseOrder, StoreConfig, OrderItem, AvariaRecord } from '../shared/types';

interface MobileSeparationViewProps {
  order: PurchaseOrder;
  orders?: PurchaseOrder[];
  onSelectOrder?: (order: PurchaseOrder) => void;
  onUpdateOrder: (order: PurchaseOrder) => void;
  onFinalizeOrder?: (order: PurchaseOrder) => void;
}

export const MobileSeparationView: React.FC<MobileSeparationViewProps> = ({
  order,
  orders = [],
  onSelectOrder,
  onUpdateOrder,
  onFinalizeOrder
}) => {
  // Lista de pedidos aguardando separação física (status 'Em Separação')
  const pendingSeparationOrders = orders.filter(o => o.header.status === 'Em Separação');

  // Pedido ativo para separação
  const activeOrder = order.header.status === 'Em Separação' 
    ? order 
    : (pendingSeparationOrders[0] || order);

  const activeStores = (activeOrder.storeConfigs || []).filter(s => s.active);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(activeStores[0]?.id || 'pg_centro');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [conferenteNome, setConferenteNome] = useState(activeOrder.inspection?.conferente || '');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const selectedStore = activeStores.find(s => s.id === selectedStoreId);

  const activeOrderId = activeOrder.header.id || activeOrder.header.numeroPedido;

  const toggleCheck = (itemId: string) => {
    const key = `${activeOrderId}_${selectedStoreId}_${itemId}`;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const totalItemsStore = activeOrder.items.filter(i => (i.separacaoLojas?.[selectedStoreId] || 0) > 0);
  const checkedCount = totalItemsStore.filter(i => checkedItems[`${activeOrderId}_${selectedStoreId}_${i.id}`]).length;
  const isAllStoreChecked = totalItemsStore.length > 0 && checkedCount === totalItemsStore.length;

  const totalPecasStore = activeOrder.items.reduce((acc, i) => acc + (i.separacaoLojas?.[selectedStoreId] || 0), 0);
  const totalUnidadesGeral = activeOrder.items.reduce((acc, i) => acc + (i.qtdTotalUnidades || 0), 0);

  // Calcular progresso geral de todas as lojas
  let totalChecksPossible = 0;
  let totalChecksDone = 0;
  activeStores.forEach(s => {
    activeOrder.items.forEach(i => {
      if ((i.separacaoLojas?.[s.id] || 0) > 0) {
        totalChecksPossible++;
        if (checkedItems[`${activeOrderId}_${s.id}_${i.id}`]) {
          totalChecksDone++;
        }
      }
    });
  });

  const percentualConcluido = totalChecksPossible > 0 
    ? Math.round((totalChecksDone / totalChecksPossible) * 100) 
    : 0;

  // Finalizar a separação do pedido
  const handleFinalize = () => {
    const finalizedOrder: PurchaseOrder = {
      ...activeOrder,
      header: {
        ...activeOrder.header,
        status: 'Finalizado',
        updatedAt: new Date().toISOString()
      },
      inspection: {
        conferente: conferenteNome || 'Conferente de Doca',
        dataConferencia: new Date().toISOString(),
        possuiAvarias: (activeOrder.inspection?.avarias?.length || 0) > 0,
        observacoesDoca: activeOrder.inspection?.observacoesDoca || 'Separação concluída via Romaneio de Bolso.',
        avarias: activeOrder.inspection?.avarias || []
      }
    };

    onUpdateOrder(finalizedOrder);
    if (onFinalizeOrder) {
      onFinalizeOrder(finalizedOrder);
    }
    setShowConfirmModal(false);
  };

  // Se o pedido atual NÃO estiver Em Separação e não houver pedidos na fila
  if (activeOrder.header.status !== 'Em Separação' && pendingSeparationOrders.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center space-y-4 my-8">
        <div className="w-16 h-16 rounded-3xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Nenhum Pedido em Separação no Momento
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            Os pedidos só entram na fila da doca após serem <b>Aprovados</b> e enviados para o status <b>"Em Separação"</b> pelo Comprador ou Diretoria.
          </p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-2">
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Pedido Atual Carregado:
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-900 dark:text-white">{activeOrder.header.numeroPedido}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
              Status: {activeOrder.header.status}
            </span>
          </div>
          <button
            onClick={() => onUpdateOrder({ ...activeOrder, header: { ...activeOrder.header, status: 'Em Separação' } })}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer mt-2"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Colocar este Pedido Em Separação</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-16 animate-in fade-in duration-200">
      
      {/* 1. Header do Romaneio de Bolso */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 text-white rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        
        {/* Topo do Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/10 text-purple-300 backdrop-blur-xs">
              <PackageCheck className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-200">
              Romaneio de Bolso • Doca & Carga
            </span>
          </div>
          <span className="text-xs font-mono font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2.5 py-1 rounded-full backdrop-blur-xs">
            {activeOrder.header.status}
          </span>
        </div>

        {/* Seletor de Pedidos Pendentes de Separação */}
        {pendingSeparationOrders.length > 1 && onSelectOrder && (
          <div>
            <label className="text-[10px] text-purple-200 font-bold block mb-1 uppercase tracking-wider">
              Fila de Pedidos para Separar ({pendingSeparationOrders.length}):
            </label>
            <select
              value={activeOrder.header.id || activeOrder.header.numeroPedido}
              onChange={(e) => {
                const found = pendingSeparationOrders.find(o => (o.header.id || o.header.numeroPedido) === e.target.value);
                if (found) onSelectOrder(found);
              }}
              className="w-full p-2.5 bg-black/40 border border-white/20 rounded-xl text-white font-extrabold text-xs outline-hidden cursor-pointer"
            >
              {pendingSeparationOrders.map(o => (
                <option key={o.header.id || o.header.numeroPedido} value={o.header.id || o.header.numeroPedido} className="bg-slate-900 text-white">
                  📦 {o.header.numeroPedido} • {o.header.fornecedor} ({o.items.length} itens)
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <h2 className="text-xl font-black tracking-tight text-white line-clamp-1">
            {activeOrder.header.fornecedor}
          </h2>
          <div className="text-xs text-purple-200 font-mono mt-0.5">
            Pedido: <b>{activeOrder.header.numeroPedido}</b> • {totalUnidadesGeral.toLocaleString('pt-BR')} unidades no total da carga
          </div>
        </div>

        {/* Barra de Progresso Global */}
        <div className="space-y-1.5 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] text-purple-200 font-bold">
            <span>Progresso da Conferência:</span>
            <span>{percentualConcluido}% ({totalChecksDone}/{totalChecksPossible} itens)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${percentualConcluido}%` }}
            />
          </div>
        </div>

        {/* Seletor de Loja */}
        <div>
          <label className="text-[11px] text-purple-200 font-bold block mb-1">
            Selecione a Filial / Caminhão:
          </label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full p-3 bg-black/40 border border-white/20 rounded-2xl text-white font-black text-sm outline-hidden cursor-pointer"
          >
            {activeStores.map(s => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                🏬 {s.name} (Cluster {s.cluster} • Peso {s.defaultWeight})
              </option>
            ))}
          </select>
        </div>

        {/* Resumo da Filial Selecionada */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-center">
          <div className="p-2.5 rounded-2xl bg-black/30 backdrop-blur-xs border border-white/10">
            <div className="text-[10px] text-purple-200 uppercase font-bold">Carga Desta Loja</div>
            <div className="text-base font-black font-mono text-white mt-0.5">
              {totalPecasStore.toLocaleString('pt-BR')} un
            </div>
            <div className="text-[10px] text-purple-200 font-mono">
              ({totalPecasStore.toLocaleString('pt-BR')} unidades)
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/30 backdrop-blur-xs border border-white/10 flex flex-col justify-center">
            <div className="text-[10px] text-purple-200 uppercase font-bold">Status Loja</div>
            <div className={`text-xs font-black mt-1 flex items-center justify-center gap-1 ${
              isAllStoreChecked ? 'text-emerald-400' : 'text-amber-300'
            }`}>
              {isAllStoreChecked ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Conferida!</span>
                </>
              ) : (
                <span>{checkedCount}/{totalItemsStore.length} conferidos</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Check-list de Produtos da Loja Selecionada */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Produtos para {selectedStore?.name}
          </h3>
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">
            {checkedCount} de {totalItemsStore.length} checados
          </span>
        </div>

        {totalItemsStore.map((item) => {
          const qtdLoja = item.separacaoLojas?.[selectedStoreId] || 0;
          const isChecked = Boolean(checkedItems[`${activeOrderId}_${selectedStoreId}_${item.id}`]);

          return (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                isChecked
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="mt-0.5 shrink-0">
                  {isChecked ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                  )}
                </div>

                {/* Foto ou Ícone */}
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                  {item.fotoUrl ? (
                    <img src={item.fotoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Boxes className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className={`text-xs font-bold ${isChecked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'} line-clamp-2`}>
                    {item.descricao}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {item.codigo && <span>[{item.codigo}] </span>}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2">
                <div className="text-sm font-black font-mono text-purple-600 dark:text-purple-400">
                  {qtdLoja.toLocaleString('pt-BR')} un
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Botão Prominente de Salvar & Finalizar Separação */}
      <div className="pt-2">
        <button
          onClick={() => setShowConfirmModal(true)}
          className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save className="w-5 h-5" />
          <span>Salvar & Finalizar Separação</span>
        </button>
      </div>

      {/* Modal de Confirmação de Finalização */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Finalizar Separação do Pedido?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O pedido <b>{activeOrder.header.numeroPedido}</b> será marcado como <b>Finalizado</b> e arquivado com a conferência das 20 lojas.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nome do Conferente / Responsável:
              </label>
              <input
                type="text"
                value={conferenteNome}
                onChange={(e) => setConferenteNome(e.target.value)}
                placeholder="Ex: João da Doca"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium text-xs outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleFinalize}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
