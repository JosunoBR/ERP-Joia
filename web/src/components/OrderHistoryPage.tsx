import React, { useState } from 'react';
import { 
  FolderOpen, 
  Search, 
  Trash2, 
  FileSpreadsheet, 
  ArrowRight, 
  Calendar, 
  DollarSign, 
  Boxes, 
  Package, 
  CheckCircle2, 
  PlusCircle,
  Sparkles,
  PackageCheck,
  Check
} from 'lucide-react';
import { PurchaseOrder } from '../shared/types';
import { exportOrderToExcel } from '../utils/excelExporter';
import { toBrDate } from '../utils/masks';
import { PurchaseControlCard } from './PurchaseControlCard';

interface OrderHistoryPageProps {
  orders: PurchaseOrder[];
  onSelectOrder: (order: PurchaseOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  onNewOrder: () => void;
  onUpdateOrderStatus?: (order: PurchaseOrder, newStatus: string) => void;
  onNavigateToSeparation?: (order: PurchaseOrder) => void;
}

export const OrderHistoryPage: React.FC<OrderHistoryPageProps> = ({
  orders,
  onSelectOrder,
  onDeleteOrder,
  onNewOrder,
  onUpdateOrderStatus,
  onNavigateToSeparation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('todos');
  const [controlFilterIds, setControlFilterIds] = useState<Set<string> | null>(null);

  const filteredOrders = orders.filter(o => {
    if (controlFilterIds !== null) {
      const orderId = o.id || o.header?.id;
      if (orderId && !controlFilterIds.has(orderId)) {
        return false;
      }
    }

    const matchesSearch = 
      o.header.numeroPedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.header.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.header.vendedor && o.header.vendedor.toLowerCase().includes(searchTerm.toLowerCase()));

    const currentStatus = o.header.status || 'Em Cotação';
    const matchesStatus = selectedStatusTab === 'todos' || currentStatus === selectedStatusTab;

    return matchesSearch && matchesStatus;
  });

  const totalPedidos = orders.length;
  const totalInvestidoGeral = orders.reduce((acc, o) => {
    const totalPedido = o.items.reduce((sum, item) => sum + (item.valorTotalBruto || 0), 0);
    return acc + totalPedido;
  }, 0);

  const totalPecasGeral = orders.reduce((acc, o) => {
    const totalPecas = o.items.reduce((sum, item) => sum + (item.qtdTotalUnidades || 0), 0);
    return acc + totalPecas;
  }, 0);

  const countByStatus = {
    todos: orders.length,
    'Em Cotação': orders.filter(o => (o.header.status || 'Em Cotação') === 'Em Cotação').length,
    'Aprovado': orders.filter(o => o.header.status === 'Aprovado').length,
    'Em Distribuição': orders.filter(o => o.header.status === 'Em Distribuição').length,
    'Em Separação': orders.filter(o => o.header.status === 'Em Separação').length,
    'Finalizado': orders.filter(o => o.header.status === 'Finalizado').length
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'Finalizado':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Em Separação':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'Em Distribuição':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'Aprovado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Em Cotação':
      default:
        return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header da Página */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Histórico & Arquivo de Pedidos
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono">
                {totalPedidos} {totalPedidos === 1 ? 'Pedido' : 'Pedidos'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Arquivo central de compras salvas no banco de dados SQLite com controle de status e romaneios
            </p>
          </div>
        </div>

        <button
          onClick={onNewOrder}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Criar Novo Pedido
        </button>
      </div>

      {/* 2. Card de Controle de Compras (Filtros por Mês, Ano etc., Médias, Extremos e Navegação) */}
      <PurchaseControlCard
        orders={orders}
        onSelectOrder={onSelectOrder}
        onFilterChange={setControlFilterIds}
      />

      {/* 3. Abas de Status da Esteira Operacional Oficial */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedStatusTab('todos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'todos'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <span>Todos os Pedidos</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 dark:bg-white/20">
            {countByStatus.todos}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('Em Cotação')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'Em Cotação'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-50'
          }`}
        >
          <span>🟡 1. Em Cotação (Compras)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {countByStatus['Em Cotação']}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('Aprovado')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'Aprovado'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-50'
          }`}
        >
          <span>🔵 2. Aprovados</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {countByStatus['Aprovado']}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('Em Distribuição')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'Em Distribuição'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50'
          }`}
        >
          <span>🟣 3. Em Distribuição (CD)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {countByStatus['Em Distribuição']}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('Em Separação')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'Em Separação'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-50'
          }`}
        >
          <span>📦 4. Em Separação (Doca)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {countByStatus['Em Separação']}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('Finalizado')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'Finalizado'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50'
          }`}
        >
          <span>🟢 5. Finalizados</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {countByStatus['Finalizado']}
          </span>
        </button>
      </div>

      {/* 4. Tabela de Pedidos Salvos */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
        
        {/* Barra de Busca */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número (ex: PED-0001), fornecedor ou vendedor..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden"
          />
        </div>

        {/* Tabela de Pedidos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 whitespace-nowrap min-w-[110px]">Pedido / Número</th>
                <th className="py-3 px-3 min-w-[200px]">Fornecedor</th>
                <th className="py-3 px-3 whitespace-nowrap min-w-[105px]">Data</th>
                <th className="py-3 px-3 text-center whitespace-nowrap min-w-[70px]">Itens</th>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[110px]">Volume Peças</th>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[130px]">Valor Total (R$)</th>
                <th className="py-3 px-3 text-center whitespace-nowrap min-w-[130px]">Status</th>
                <th className="py-3 px-3 text-center whitespace-nowrap min-w-[140px]">Avançar Esteira</th>
                <th className="py-3 px-3 text-center whitespace-nowrap min-w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    Nenhum pedido encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const totalPedido = ord.items.reduce((acc, item) => acc + (item.valorTotalBruto || 0), 0);
                  const totalPecas = ord.items.reduce((acc, item) => acc + (item.qtdTotalUnidades || 0), 0);
                  const statusAtual = ord.header.status || 'Em Cotação';

                  return (
                    <tr key={ord.header.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                      
                      <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {ord.header.numeroPedido}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {ord.header.fornecedor}
                        </div>
                        {ord.header.vendedor && (
                          <div className="text-[11px] text-slate-400">
                            Rep: {ord.header.vendedor}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                        {toBrDate(ord.header.dataPedido || ord.header.createdAt)}
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {ord.items.length}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {totalPecas.toLocaleString('pt-BR')} un
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        R$ {totalPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusBadgeClass(statusAtual)}`}>
                          {statusAtual}
                        </span>
                      </td>

                      {/* Botão de Avanço Rápido de Status da Esteira */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {statusAtual === 'Em Cotação' && onUpdateOrderStatus && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord, 'Aprovado')}
                            className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer flex items-center gap-1 mx-auto"
                            title="Aprovar este pedido e encaminhar para a distribuição do Depósito"
                          >
                            <span>✓ Aprovar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {(statusAtual === 'Aprovado' || statusAtual === 'Em Distribuição') && (
                          <button
                            onClick={() => onNavigateToSeparation ? onNavigateToSeparation(ord) : onSelectOrder(ord)}
                            className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer flex items-center gap-1 mx-auto"
                            title="Abrir a matriz de distribuição do Depósito para ratear nas 20 lojas e dar entrada no estoque"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                            <span>Distribuir CD</span>
                          </button>
                        )}
                        {statusAtual === 'Em Separação' && (
                          <button
                            onClick={() => onNavigateToSeparation ? onNavigateToSeparation(ord) : onSelectOrder(ord)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer mx-auto"
                            title="Conferir separação física na Doca"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Separar Doca</span>
                          </button>
                        )}
                        {statusAtual === 'Finalizado' && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1 mx-auto">
                            <Check className="w-3.5 h-3.5" /> Concluído
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          <button
                            onClick={() => onSelectOrder(ord)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition cursor-pointer"
                            title="Abrir este pedido no editor"
                          >
                            <span>Abrir</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => exportOrderToExcel(ord)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                            title="Exportar Planilha Excel (.xlsx)"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

                          {onDeleteOrder && (
                            <button
                              onClick={() => onDeleteOrder(ord.id || ord.header.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              title="Excluir este pedido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
