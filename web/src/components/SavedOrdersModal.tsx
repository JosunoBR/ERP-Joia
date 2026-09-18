import React from 'react';
import { 
  X, 
  FolderOpen, 
  Trash2, 
  Copy, 
  ArrowRight, 
  Calendar, 
  Building2, 
  Package 
} from 'lucide-react';
import { PurchaseOrder } from '../shared/types';
import { loadSavedOrdersList } from '../utils/storage';

interface SavedOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (order: PurchaseOrder) => void;
}

export const SavedOrdersModal: React.FC<SavedOrdersModalProps> = ({
  isOpen,
  onClose,
  onSelectOrder
}) => {
  if (!isOpen) return null;

  const orders = loadSavedOrdersList();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Histórico de Pedidos de Compra
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pedidos gravados localmente no sistema
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

        {/* List */}
        <div className="p-6 space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Nenhum pedido salvo ainda no histórico.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Clique no botão "Salvar" na barra superior para guardar suas cotações e pedidos.
              </p>
            </div>
          ) : (
            orders.map(order => {
              const totalPecas = order.items.reduce((a, b) => a + b.qtdTotalUnidades, 0);
              const totalValor = order.items.reduce((a, b) => a + b.valorTotalBruto, 0);

              return (
                <div
                  key={order.header.id}
                  onClick={() => {
                    onSelectOrder(order);
                    onClose();
                  }}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {order.header.numeroPedido}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {order.header.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {order.header.fornecedor}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                      <span>{order.items.length} itens ({totalPecas.toLocaleString('pt-BR')} un)</span>
                      <span>•</span>
                      <span>R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span>•</span>
                      <span>{new Date(order.header.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Abrir <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/80 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
