import React from 'react';
import { 
  FileEdit, 
  CheckCircle2, 
  Boxes, 
  PackageCheck, 
  CheckCheck, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Truck, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { PurchaseOrder, User, OrderStatus } from '../shared/types';

interface OrderPipelineStepperProps {
  order: PurchaseOrder;
  currentUser?: User | null;
  onApproveOrder?: (order: PurchaseOrder) => void;
  onOpenDistribution?: (order: PurchaseOrder) => void;
  onReleaseToSeparation?: (order: PurchaseOrder) => void;
  onOpenSeparation?: (order: PurchaseOrder) => void;
  onFinalizeSeparation?: (order: PurchaseOrder) => void;
}

export const OrderPipelineStepper: React.FC<OrderPipelineStepperProps> = ({
  order,
  currentUser,
  onApproveOrder,
  onOpenDistribution,
  onReleaseToSeparation,
  onOpenSeparation,
  onFinalizeSeparation
}) => {
  const currentStatus = order.header.status || 'Em Cotação';
  const role = currentUser?.role || 'diretoria';

  // Definição das 5 etapas da esteira
  const steps = [
    {
      id: 'Em Cotação',
      label: '1. Cotação & Compras',
      description: 'Elaboração e negociação comercial',
      icon: FileEdit,
      badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
    },
    {
      id: 'Aprovado',
      label: '2. Aprovado',
      description: 'Aprovado comercialmente',
      icon: CheckCircle2,
      badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
    },
    {
      id: 'Em Distribuição',
      label: '3. Distribuição / CD',
      description: 'Rateio das 20 lojas e entrada de estoque CD',
      icon: Boxes,
      badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800'
    },
    {
      id: 'Em Separação',
      label: '4. Separação & Doca',
      description: 'Conferência física e paletização das lojas',
      icon: PackageCheck,
      badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800'
    },
    {
      id: 'Finalizado',
      label: '5. Finalizado',
      description: 'Conferido, despachado e baixado',
      icon: CheckCheck,
      badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
    }
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'Rascunho':
      case 'Em Cotação':
        return 0;
      case 'Aprovado':
        return 1;
      case 'Em Distribuição':
        return 2;
      case 'Em Separação':
      case 'Conferido':
        return 3;
      case 'Finalizado':
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs px-4 py-3 mb-5 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Lado Esquerdo: Barra Visual da Esteira de Etapas */}
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500">
            <span>ESTEIRA:</span>
            <span className="px-2 py-0.5 rounded-lg font-mono font-extrabold text-[11px] bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {order?.header?.numeroPedido || 'PED-0001'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 1. Cotação */}
            <div className={`flex items-center gap-1 text-xs font-bold ${currentIndex > 0 ? 'text-emerald-600 dark:text-emerald-400' : currentIndex === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex >= 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {currentIndex > 0 ? '✓' : '1'}
              </span>
              <span>1. Cotação</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
            </div>

            {/* 2. Aprovado */}
            <div className={`flex items-center gap-1 text-xs font-bold ${currentIndex > 1 ? 'text-emerald-600 dark:text-emerald-400' : currentIndex === 1 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {currentIndex > 1 ? '✓' : '2'}
              </span>
              <span>2. Aprovado</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
            </div>

            {/* 3. Distribuição */}
            <div className={`flex items-center gap-1 text-xs font-bold ${currentIndex > 2 ? 'text-emerald-600 dark:text-emerald-400' : currentIndex === 2 ? 'text-indigo-700 dark:text-indigo-300 font-black' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex === 2 ? 'bg-indigo-600 text-white shadow-xs' : currentIndex > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {currentIndex > 2 ? '✓' : '3'}
              </span>
              <span>3. Distribuição</span>
              {currentIndex === 2 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
            </div>

            {/* 4. Separação */}
            <div className={`flex items-center gap-1.5 text-xs font-bold ${currentIndex === 3 ? 'text-emerald-900 dark:text-white font-black' : currentIndex > 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentIndex === 3 ? 'bg-emerald-700 text-white shadow-xs' : currentIndex > 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {currentIndex > 3 ? '✓' : '4'}
              </span>
              <span>4. Separação</span>
              {currentIndex === 3 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
            </div>

            {/* 5. Finalizado */}
            <div className={`flex items-center gap-1 text-xs font-bold ${currentIndex >= 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                {currentIndex >= 4 ? '✓' : '5'}
              </span>
              <span>5. Finalizado</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Ações rápidas de esteira */}
        <div className="flex items-center gap-2 shrink-0">
          {currentIndex <= 1 && onOpenDistribution && (
            <button
              onClick={() => onOpenDistribution(order)}
              className="px-3 py-1 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Abrir Distribuição (CD)</span>
            </button>
          )}

          {currentIndex === 2 && onReleaseToSeparation && (
            <button
              onClick={() => onReleaseToSeparation(order)}
              className="px-3 py-1 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Liberar para Separação</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
