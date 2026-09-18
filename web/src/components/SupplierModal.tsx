import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  Phone, 
  User, 
  CreditCard, 
  Search,
  CheckCircle2
} from 'lucide-react';
import { Supplier } from '../shared/types';
import { SupplierForm } from './SupplierForm';

interface SupplierModalProps {
  suppliers: Supplier[];
  isOpen: boolean;
  initialEditSupplier?: Supplier | null;
  onClose: () => void;
  onSaveSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onSelectSupplierForOrder?: (supplier: Supplier) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  suppliers,
  isOpen,
  initialEditSupplier,
  onClose,
  onSaveSupplier,
  onDeleteSupplier,
  onSelectSupplierForOrder
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(initialEditSupplier || null);
  const [isFormOpen, setIsFormOpen] = useState(!!initialEditSupplier);

  const handleOpenNewForm = () => {
    setEditingSupplier(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (sup: Supplier) => {
    setEditingSupplier(sup);
    setIsFormOpen(true);
  };

  const handleSaveForm = (supplierData: Supplier) => {
    onSaveSupplier(supplierData);
    if (onSelectSupplierForOrder) {
      onSelectSupplierForOrder(supplierData);
    }
    setIsFormOpen(false);
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nomeFantasia && s.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.vendedorPadrao && s.vendedorPadrao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cadastro de Fornecedores & Parâmetros Fiscais (ST)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie fornecedores, vendedores, condições de pagamento e taxa de ST
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

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Top action bar: Search & Add */}
          {!isFormOpen && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar fornecedor, vendedor..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <button
                onClick={handleOpenNewForm}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                Novo Fornecedor
              </button>
            </div>
          )}

          {/* Supplier Form */}
          {isFormOpen ? (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <SupplierForm
                initialSupplier={editingSupplier}
                onSave={handleSaveForm}
                onCancel={() => setIsFormOpen(false)}
                submitText={editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                showCardHeader={true}
              />
            </div>
          ) : (
            /* Suppliers List */
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredSuppliers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhum fornecedor encontrado.
                </div>
              ) : (
                filteredSuppliers.map(sup => (
                  <div
                    key={sup.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-emerald-500 dark:hover:border-emerald-500 transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {sup.razaoSocial}
                        </span>
                        {sup.nomeFantasia && (
                          <span className="text-[11px] text-slate-400">
                            ({sup.nomeFantasia})
                          </span>
                        )}
                        {sup.percentualNotaPadrao !== undefined && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            OFF: {sup.percentualNotaPadrao}%
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 mt-1">
                        {sup.vendedorPadrao && (
                          <span>Vendedor: <strong>{sup.vendedorPadrao}</strong></span>
                        )}
                        {sup.contatoVendedor && (
                          <span>Vendedor Tel: {sup.contatoVendedor}</span>
                        )}
                        {sup.telefoneEmpresa && (
                          <span>Empresa Tel: <strong>{sup.telefoneEmpresa}</strong></span>
                        )}
                        {sup.email && (
                          <span>E-mail: <strong>{sup.email}</strong></span>
                        )}
                        {sup.endereco && (
                          <span className="truncate max-w-xs" title={sup.endereco}>End: {sup.endereco}</span>
                        )}
                        {sup.condicaoPagamentoPadrao && (
                          <span>Condição: {sup.condicaoPagamentoPadrao}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onSelectSupplierForOrder && (
                        <button
                          onClick={() => {
                            onSelectSupplierForOrder(sup);
                            onClose();
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1"
                          title="Usar este fornecedor no pedido atual"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selecionar
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditForm(sup)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Editar fornecedor"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {suppliers.length > 1 && (
                        <button
                          onClick={() => {
                            const msg = `Deseja realmente excluir o fornecedor "${sup.razaoSocial}"?\n\n⚠️ ATENÇÃO: Os produtos vinculados a este fornecedor também serão excluídos do catálogo.\n(Produtos de outros fornecedores e o histórico de compras anteriores serão mantidos).`;
                            if (confirm(msg)) {
                              onDeleteSupplier(sup.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                          title="Excluir fornecedor e produtos vinculados"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 sticky bottom-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total de fornecedores cadastrados: <strong className="text-slate-900 dark:text-white font-mono">{suppliers.length}</strong>
          </span>
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
