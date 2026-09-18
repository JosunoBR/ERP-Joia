import React, { useState, useMemo } from 'react';
import { 
  PackageCheck, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  ArrowRight, 
  UserCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Boxes, 
  Warehouse, 
  Layers, 
  AlertTriangle,
  User,
  Sparkles,
  TrendingUp,
  Filter,
  Eye,
  X,
  Store,
  Calendar,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { PurchaseOrder, StoreConfig, AvariaRecord } from '../shared/types';
import { exportOrderToExcel } from '../utils/excelExporter';
import { exportRomaneioPDF } from '../utils/pdfExporter';
import { convertAvariaToUnits } from './SeparationPage';

interface SeparationHistoryPageProps {
  orders: PurchaseOrder[];
  stores: StoreConfig[];
  onSelectOrderForSeparation: (order: PurchaseOrder) => void;
  onNavigateToSeparation: () => void;
}

export const SeparationHistoryPage: React.FC<SeparationHistoryPageProps> = ({
  orders,
  stores,
  onSelectOrderForSeparation,
  onNavigateToSeparation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'conferido' | 'com_avarias' | 'pendente'>('all');
  const [selectedConferente, setSelectedConferente] = useState<string>('all');
  const [selectedInspectionOrder, setSelectedInspectionOrder] = useState<PurchaseOrder | null>(null);

  // Helper para calcular o prejuízo real de um conjunto de avarias
  const calculateOrderLoss = (ord: PurchaseOrder): number => {
    if (!ord.inspection?.possuiAvarias || !ord.inspection.avarias) return 0;
    return ord.inspection.avarias.reduce((sum, av) => {
      const itemRef = ord.items.find(i => i.id === av.itemId);
      const pack = itemRef?.qtdPorPacote || 1;
      const units = convertAvariaToUnits(av.quantidade, av.unidadeMedida, pack);
      const unitCost = itemRef?.custoRealEfetivo || itemRef?.precoUnitario || 0;
      return sum + (units * unitCost);
    }, 0);
  };

  // Extrair lista única de conferentes que já realizaram separação
  const conferentesList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.inspection?.conferente && o.inspection.conferente.trim() !== '') {
        set.add(o.inspection.conferente.trim());
      }
    });
    return Array.from(set);
  }, [orders]);

  // Filtragem dos pedidos de separação
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = 
        o.header.numeroPedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.header.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.inspection?.conferente && o.inspection.conferente.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.inspection?.observacoesDoca && o.inspection.observacoesDoca.toLowerCase().includes(searchTerm.toLowerCase()));

      const hasAvarias = Boolean(o.inspection?.possuiAvarias && o.inspection.avarias && o.inspection.avarias.length > 0);
      const isConferido = Boolean(o.inspection?.conferente && o.inspection.conferente.trim() !== '');

      let matchStatus = true;
      if (statusFilter === 'conferido') matchStatus = isConferido && !hasAvarias;
      if (statusFilter === 'com_avarias') matchStatus = hasAvarias;
      if (statusFilter === 'pendente') matchStatus = !isConferido;

      let matchConferente = true;
      if (selectedConferente !== 'all') {
        matchConferente = o.inspection?.conferente?.trim() === selectedConferente;
      }

      return matchSearch && matchStatus && matchConferente;
    });
  }, [orders, searchTerm, statusFilter, selectedConferente]);

  // Estatísticas e Métricas de Desempenho
  const metrics = useMemo(() => {
    let totalPecasGeral = 0;
    let totalPecasCD = 0;
    let totalPedidosConferidos = 0;
    let totalAvariasOcorrencias = 0;
    let totalPrejuizoAvarias = 0;

    const separadorStats: Record<string, { pedidos: number; pecas: number; avarias: number }> = {};

    orders.forEach(o => {
      const pecasPedido = o.items.reduce((sum, item) => sum + (item.qtdTotalUnidades || 0), 0);
      const pecasCD = o.items.reduce((sum, item) => sum + (item.qtdReservaEstoque || 0), 0);

      totalPecasGeral += pecasPedido;
      totalPecasCD += pecasCD;

      const orderLoss = calculateOrderLoss(o);

      const conferenteNome = o.inspection?.conferente?.trim();
      if (conferenteNome) {
        totalPedidosConferidos += 1;
        if (!separadorStats[conferenteNome]) {
          separadorStats[conferenteNome] = { pedidos: 0, pecas: 0, avarias: 0 };
        }
        separadorStats[conferenteNome].pedidos += 1;
        separadorStats[conferenteNome].pecas += pecasPedido;
        
        if (o.inspection?.possuiAvarias && o.inspection.avarias) {
          separadorStats[conferenteNome].avarias += o.inspection.avarias.length;
        }
      }

      if (o.inspection?.possuiAvarias && o.inspection.avarias) {
        totalAvariasOcorrencias += o.inspection.avarias.length;
        totalPrejuizoAvarias += orderLoss;
      }
    });

    const rankingSeparadores = Object.entries(separadorStats).map(([nome, stat]) => ({
      nome,
      ...stat
    })).sort((a, b) => b.pecas - a.pecas);

    return {
      totalPecasGeral,
      totalPecasCD,
      totalPedidosConferidos,
      totalAvariasOcorrencias,
      totalPrejuizoAvarias,
      rankingSeparadores
    };
  }, [orders]);

  const handleOpenSeparation = (orderToOpen: PurchaseOrder) => {
    onSelectOrderForSeparation(orderToOpen);
    onNavigateToSeparation();
  };

  const handleExportPDF = (orderToExport: PurchaseOrder) => {
    exportRomaneioPDF(orderToExport, stores);
  };

  const handleExportExcel = (orderToExport: PurchaseOrder) => {
    exportOrderToExcel(orderToExport, stores);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header da Tela */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Histórico de Separações & Desempenho Operacional
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono">
                {orders.length} Romaneios
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registro auditável de quem separou e conferiu cada carga, volumes distribuídos, avarias e produtividade da equipe
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToSeparation}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
        >
          <Boxes className="w-4 h-4" />
          <span>Ver Separação do Pedido Atual</span>
        </button>
      </div>

      {/* 2. Cards de Métricas Operacionais de Galpão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Peças Separadas */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Unidades Processadas</span>
            <Boxes className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
            {metrics.totalPecasGeral.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Volume total de mercadorias separadas
          </span>
        </div>

        {/* Romaneios Conferidos */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Romaneios Conferidos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {metrics.totalPedidosConferidos} <span className="text-xs font-normal text-slate-400">de {orders.length} pedidos</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {conferentesList.length} conferentes ativos registrados
          </span>
        </div>

        {/* Guardado no CD */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Retenção Central (CD)</span>
            <Warehouse className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            {metrics.totalPecasCD.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Reserva estratégica guardada na Matriz
          </span>
        </div>

        {/* Avarias & Ocorrências */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'com_avarias' ? 'all' : 'com_avarias')}
          className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-rose-200 dark:border-rose-800/80 shadow-xs cursor-pointer hover:bg-rose-50/30 dark:hover:bg-rose-950/30 transition group"
          title="Clique para filtrar apenas pedidos com avarias apontadas"
        >
          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1 flex items-center justify-between">
            <span>Avarias na Doca</span>
            <ShieldAlert className="w-4 h-4 text-rose-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
            {metrics.totalAvariasOcorrencias} <span className="text-xs font-normal text-slate-400">ocorrências</span>
          </div>
          <span className="text-[11px] text-rose-500/80 dark:text-rose-400 font-mono mt-0.5 block">
            R$ {metrics.totalPrejuizoAvarias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em prejuízo apontado
          </span>
        </div>

      </div>

      {/* 3. Painel de Desempenho dos Separadores / Conferentes */}
      {metrics.rankingSeparadores.length > 0 && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Quadro de Desempenho da Equipe de Galpão / Doca
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Produtividade acumulada por conferente responsável
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
              Ranking de Produtividade
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {metrics.rankingSeparadores.map((conf, index) => (
              <div 
                key={conf.nome}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      {conf.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]" title={conf.nome}>
                        {conf.nome}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {index === 0 ? '🏆 Líder em Volumes' : `Posição #${index + 1}`}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                    {conf.pecas.toLocaleString('pt-BR')} un
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cargas:</span>
                    <strong className="font-mono">{conf.pedidos} pedidos</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Avarias:</span>
                    <strong className={`font-mono ${conf.avarias > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {conf.avarias === 0 ? '✅ 0 avarias' : `⚠️ ${conf.avarias} apont.`}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Barra de Filtros & Pesquisa */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Campo de Busca */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nº Pedido, Fornecedor ou Nome do Separador..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden font-medium"
          />
        </div>

        {/* Filtros de Status e Separador */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          
          <select
            value={selectedConferente}
            onChange={(e) => setSelectedConferente(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-hidden cursor-pointer"
          >
            <option value="all">👤 Todos Separadores</option>
            {conferentesList.map(conf => (
              <option key={conf} value={conf}>👤 {conf}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-hidden cursor-pointer"
          >
            <option value="all">🔍 Todos os Status</option>
            <option value="conferido">✅ 100% Conferidos (Sem Avaria)</option>
            <option value="com_avarias">⚠️ Com Avarias na Doca</option>
            <option value="pendente">⏳ Separação Pendente</option>
          </select>

        </div>
      </div>

      {/* 5. Tabela de Registros de Separação de Cada Pedido */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wide">
                Registros de Separação & Romaneio por Pedido
              </h3>
              <p className="text-[11px] text-slate-400">
                Histórico detalhado com auditoria de conferente, volumes rateados e documentos
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                <th className="py-3 px-4">Nº Pedido / Fornecedor</th>
                <th className="py-3 px-4">Separador / Conferente</th>
                <th className="py-3 px-3 text-center">Total Unidades</th>
                <th className="py-3 px-3 text-center">Estoque CD</th>
                <th className="py-3 px-3 text-center">Status Doca</th>
                <th className="py-3 px-3 text-center">Ocorrências</th>
                <th className="py-3 px-4 text-center">Ações Operacionais</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum registro de separação encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(orderItem => {
                  const pecas = orderItem.items.reduce((sum, i) => sum + (i.qtdTotalUnidades || 0), 0);
                  const pecasCD = orderItem.items.reduce((sum, i) => sum + (i.qtdReservaEstoque || 0), 0);

                  const conferente = orderItem.inspection?.conferente?.trim();
                  const possuiAvarias = Boolean(orderItem.inspection?.possuiAvarias && orderItem.inspection.avarias && orderItem.inspection.avarias.length > 0);
                  const qtdAvarias = orderItem.inspection?.avarias?.length || 0;
                  const valorPerda = orderItem.inspection?.totalPrejuizoAvarias || 0;

                  return (
                    <tr key={orderItem.header.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      
                      {/* 1. Pedido & Fornecedor */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            {orderItem.header.numeroPedido}
                          </span>
                          <span className="truncate max-w-[180px]">{orderItem.header.fornecedor}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Entrega: {orderItem.header.dataEntregaPrevista || 'A definir'} • {orderItem.items.length} itens
                        </div>
                      </td>

                      {/* 2. Separador Responsável */}
                      <td className="py-3.5 px-4">
                        {conferente ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">
                              {conferente.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {conferente}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                Conferente de Doca
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 italic">
                            <User className="w-3.5 h-3.5" /> Não apontado
                          </span>
                        )}
                      </td>

                      {/* 3. Total Unidades */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {pecas.toLocaleString('pt-BR')} un
                        </div>
                      </td>

                      {/* 4. Estoque CD */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        <div className="font-bold text-amber-700 dark:text-amber-400">
                          {pecasCD.toLocaleString('pt-BR')} un
                        </div>
                        <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                          no Depósito
                        </div>
                      </td>

                      {/* 5. Status Doca */}
                      <td className="py-3.5 px-3 text-center">
                        {conferente ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Conferido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Aguardando Doca
                          </span>
                        )}
                      </td>

                      {/* 6. Ocorrências / Avarias */}
                      <td className="py-3.5 px-3 text-center">
                        {possuiAvarias ? (
                          <button
                            type="button"
                            onClick={() => setSelectedInspectionOrder(orderItem)}
                            className="inline-flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer group"
                            title="Clique para auditar o detalhamento das avarias"
                          >
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 group-hover:scale-105 transition shadow-xs">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                              {qtdAvarias} {qtdAvarias === 1 ? 'Avaria' : 'Avarias'}
                            </span>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold font-mono mt-0.5">
                              -R$ {calculateOrderLoss(orderItem).toFixed(2)}
                            </span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            100% Íntegro
                          </span>
                        )}
                      </td>

                      {/* 7. Ações */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          <button
                            onClick={() => handleOpenSeparation(orderItem)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                            title="Abrir matriz de separação e romaneio completo das 20 lojas deste pedido"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Abrir</span>
                          </button>

                          {possuiAvarias && (
                            <button
                              onClick={() => setSelectedInspectionOrder(orderItem)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition cursor-pointer"
                              title="Auditar avarias e apontamentos de doca"
                            >
                              <ShieldAlert className="w-4 h-4 text-rose-500" />
                            </button>
                          )}

                          <button
                            onClick={() => handleExportPDF(orderItem)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                            title="Gerar Romaneio PDF com assinatura do conferente"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleExportExcel(orderItem)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                            title="Baixar planilha Excel com as 3 abas"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

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

      {/* MODAL DE AUDITORIA & DETALHAMENTO DE AVARIAS DE DOCA */}
      {selectedInspectionOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            
            {/* Header do Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Auditoria de Separação & Avarias de Doca
                    </h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {selectedInspectionOrder.header.numeroPedido}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Fornecedor: <strong>{selectedInspectionOrder.header.fornecedor}</strong> • Conferência auditável
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedInspectionOrder(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações da Conferência */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Conferente Responsável</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-teal-500" />
                  {selectedInspectionOrder.inspection?.conferente || 'Conferente de Doca'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Total de Avarias</span>
                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {selectedInspectionOrder.inspection?.avarias?.length || 0} apontamentos
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block mb-0.5">Prejuízo Calculado</span>
                <span className="text-sm font-black text-rose-700 dark:text-rose-300 font-mono">
                  R$ {calculateOrderLoss(selectedInspectionOrder).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Observações de Doca */}
            {selectedInspectionOrder.inspection?.observacoesDoca && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                <strong>Observações de Doca:</strong> {selectedInspectionOrder.inspection.observacoesDoca}
              </div>
            )}

            {/* Tabela de Itens com Avaria */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Ocorrências Registradas pelo Conferente
              </h4>

              {(!selectedInspectionOrder.inspection?.avarias || selectedInspectionOrder.inspection.avarias.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  Nenhuma avaria registrada neste pedido. 100% íntegro.
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Produto</th>
                        <th className="py-2.5 px-3">Loja de Dedução</th>
                        <th className="py-2.5 px-3 text-center">Qtd / Embalagem</th>
                        <th className="py-2.5 px-3 text-right">Prejuízo (R$)</th>
                        <th className="py-2.5 px-3">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedInspectionOrder.inspection.avarias.map((av, idx) => {
                        const itemRef = selectedInspectionOrder.items.find(i => i.id === av.itemId);
                        const storeRef = stores.find(s => s.id === av.storeId);
                        const pack = itemRef?.qtdPorPacote || 1;
                        const units = convertAvariaToUnits(av.quantidade, av.unidadeMedida, pack);
                        const unitCost = itemRef?.custoRealEfetivo || itemRef?.precoUnitario || 0;
                        const loss = units * unitCost;

                        return (
                          <tr key={av.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {itemRef?.descricao || av.descricaoProduto || 'Produto'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {itemRef?.codigo || av.codigoProduto || 'N/A'} • Custo: R$ {unitCost.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                              {storeRef?.name || av.nomeLoja || 'Loja Matriz'}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold">
                              <span className="text-rose-600 dark:text-rose-400">
                                {av.quantidade} {av.unidadeMedida || 'CX'}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                ({units} peças)
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400">
                              R$ {loss.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-slate-500 dark:text-slate-400 italic">
                              {av.motivo || 'Danificada na descarga'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Ações do Rodapé */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportPDF(selectedInspectionOrder)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Romaneio PDF</span>
                </button>

                <button
                  onClick={() => handleExportExcel(selectedInspectionOrder)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const ord = selectedInspectionOrder;
                    setSelectedInspectionOrder(null);
                    handleOpenSeparation(ord);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Abrir Grade Completa das 20 Lojas</span>
                </button>

                <button
                  onClick={() => setSelectedInspectionOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
