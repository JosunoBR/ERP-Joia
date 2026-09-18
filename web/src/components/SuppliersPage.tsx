import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Phone, 
  User, 
  CreditCard, 
  Percent, 
  Truck, 
  CheckCircle2, 
  Sparkles, 
  ShoppingBag, 
  ArrowRight, 
  ShieldAlert,
  Package,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  Star,
  MapPin,
  Mail,
  Loader2
} from 'lucide-react';
import { optimizeImageFile } from '../utils/imageUtils';
import { Supplier, Product } from '../shared/types';
import { maskCNPJ, maskPhone, handleCurrencyInput, formatCurrency } from '../utils/masks';
import { SupplierForm } from './SupplierForm';

interface SuppliersPageProps {
  suppliers: Supplier[];
  products?: Product[];
  initialSupplierId?: string | null;
  onSaveSupplier: (supplier: Supplier) => Promise<void> | void;
  onDeleteSupplier: (supplierId: string) => Promise<void> | void;
  onSelectSupplierForOrder?: (supplier: Supplier) => void;
  onSaveProduct?: (product: Product) => void;
  onNavigateToProducts?: (supplierId?: string) => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({
  suppliers,
  products = [],
  initialSupplierId,
  onSaveSupplier,
  onDeleteSupplier,
  onSelectSupplierForOrder,
  onSaveProduct,
  onNavigateToProducts
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Efeito para abrir diretamente a edição ou cadastro do fornecedor selecionado
  React.useEffect(() => {
    if (initialSupplierId) {
      if (initialSupplierId === 'new') {
        setEditingSupplier(null);
        setIsCreatingNew(true);
      } else {
        const target = suppliers.find(s => s.id === initialSupplierId);
        if (target) {
          setEditingSupplier(target);
          setIsCreatingNew(true);
          setSearchTerm(target.razaoSocial);
        }
      }
    }
  }, [initialSupplierId, suppliers]);

  // Modal de Cadastro Rápido de Produto para o Fornecedor
  const [productModalSupplier, setProductModalSupplier] = useState<Supplier | null>(null);
  const [newProductData, setNewProductData] = useState<Partial<Product>>({
    codigoInterno: '',
    codigoFornecedor: '',
    codigoBarras: '',
    codigo: '',
    descricao: '',
    categoria: 'Utilidades',
    fotoUrl: '',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 0,
    pdvSugerido: 0,
    ncm: '',
    eanBarcode: ''
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const filteredSuppliers = suppliers.filter(s => 
    s.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nomeFantasia && s.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.cnpj && s.cnpj.includes(searchTerm)) ||
    (s.vendedorPadrao && s.vendedorPadrao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStartCreate = () => {
    setEditingSupplier(null);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setIsCreatingNew(true);
  };

  const handleCancelForm = () => {
    setIsCreatingNew(false);
    setEditingSupplier(null);
  };

  const handleOpenCreateProductForSupplier = (sup: Supplier) => {
    setProductModalSupplier(sup);
    const cod = `PRD-${Date.now().toString().slice(-4)}`;
    setNewProductData({
      codigoInterno: cod,
      codigo: cod,
      codigoFornecedor: '',
      codigoBarras: '',
      descricao: '',
      categoria: 'Utilidades',
      fotoUrl: '',
      qtdPorPacote: 12,
      precoUnitarioPadrao: 0,
      pdvSugerido: 0,
      ncm: '',
      eanBarcode: ''
    });
  };

  const processProductPhotoFile = async (file: File) => {
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const base64 = await optimizeImageFile(file, 1200, 1200, 0.88);
      if (base64) {
        setNewProductData(prev => ({ ...prev, fotoUrl: base64 }));
      }
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processProductPhotoFile(file);
    }
    e.target.value = '';
  };

  const handleProductPhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingPhoto) setIsDraggingPhoto(true);
  };

  const handleProductPhotoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
  };

  const handleProductPhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        processProductPhotoFile(file);
        return;
      }
    }

    const textData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (textData && (textData.startsWith('http://') || textData.startsWith('https://') || textData.startsWith('data:image/'))) {
      setNewProductData(prev => ({ ...prev, fotoUrl: textData.trim() }));
    }
  };

  const handleSaveProductFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productModalSupplier || !newProductData.descricao?.trim()) return;

    const codInterno = newProductData.codigoInterno?.trim() || newProductData.codigo?.trim() || `PRD-${Date.now()}`;
    const codForn = newProductData.codigoFornecedor?.trim() || '';
    const codBarras = newProductData.codigoBarras?.trim() || newProductData.eanBarcode?.trim() || '';

    const prodToSave: Product = {
      id: 'prod_' + Date.now(),
      codigoInterno: codInterno,
      codigo: codInterno,
      codigoFornecedor: codForn,
      codigoBarras: codBarras,
      eanBarcode: codBarras,
      descricao: newProductData.descricao.trim(),
      categoria: newProductData.categoria?.trim() || 'Geral',
      fotoUrl: newProductData.fotoUrl || '',
      qtdPorPacote: Math.max(1, Number(newProductData.qtdPorPacote) || 1),
      precoUnitarioPadrao: Math.max(0, Number(newProductData.precoUnitarioPadrao) || 0),
      pdvSugerido: Math.max(0, Number(newProductData.pdvSugerido) || 0),
      ncm: newProductData.ncm?.trim() || '',
      supplierId: productModalSupplier.id,
      nomeFornecedor: productModalSupplier.razaoSocial,
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (onSaveProduct) {
      onSaveProduct(prodToSave);
    }
    setProductModalSupplier(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header da Página */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Gestão e Cadastro de Fornecedores
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                {suppliers.length} {suppliers.length === 1 ? 'Cadastrado' : 'Cadastrados'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Parametrização de ST habitual, IPI, descontos comerciais e contatos dos vendedores
            </p>
          </div>
        </div>

        {!isCreatingNew && (
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </button>
        )}
      </div>

      {/* 2. Modal em Box: Cadastro / Edição de Fornecedor */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col p-6">
            <SupplierForm
              initialSupplier={editingSupplier}
              onSave={(supplierToSave) => {
                onSaveSupplier(supplierToSave);
                setIsCreatingNew(false);
                setEditingSupplier(null);
              }}
              onCancel={handleCancelForm}
              title={editingSupplier ? `Editar Fornecedor: ${editingSupplier.razaoSocial}` : 'Cadastrar Novo Fornecedor'}
              submitText="Salvar"
              showCardHeader={true}
            />
          </div>
        </div>
      )}

      {/* 3. Barra de Busca e Listagem dos Fornecedores */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
        
        {/* Barra de Busca */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por razão social, nome fantasia, CNPJ ou vendedor..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden"
          />
        </div>

        {/* Tabela de Fornecedores */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Fornecedor / Razão Social</th>
                <th className="py-3 px-3">CNPJ</th>
                <th className="py-3 px-3">Representante & Contato</th>
                <th className="py-3 px-3 text-center">Catálogo de Produtos</th>
                <th className="py-3 px-3">Pagamento</th>
                <th className="py-3 px-3 text-center">OFF %</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredSuppliers.map((sup) => {
                const supProducts = products.filter(p => p.supplierId === sup.id);
                const supProductsCount = supProducts.length;

                return (
                  <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                    
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {sup.razaoSocial}
                      </div>
                      {sup.nomeFantasia && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {sup.nomeFantasia}
                        </div>
                      )}
                      {sup.endereco && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5" title={sup.endereco}>
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{sup.endereco}</span>
                        </div>
                      )}
                      {(sup.pedidoPadrao || sup.pedidoPadraoJson) && (
                        <div className="mt-1">
                          <button
                            onClick={() => onSelectSupplierForOrder && onSelectSupplierForOrder(sup)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 transition cursor-pointer shadow-2xs"
                            title="Iniciar cotação carregando a Compra Padrão deste fornecedor"
                          >
                            <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                            <span>Compra Padrão ({sup.pedidoPadrao?.items?.length || (sup.pedidoPadraoJson ? JSON.parse(sup.pedidoPadraoJson).items?.length : 0)} itens)</span>
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-500">
                      {sup.cnpj || 'Não informado'}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {sup.vendedorPadrao || 'N/A'}
                      </div>
                      {sup.contatoVendedor && (
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          <span>{sup.contatoVendedor}</span>
                        </div>
                      )}
                      {sup.telefoneEmpresa && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5" title="Telefone da Empresa">
                          <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{sup.telefoneEmpresa}</span>
                        </div>
                      )}
                      {sup.email && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5" title="E-mail">
                          <Mail className="w-3 h-3 text-violet-500 shrink-0" />
                          <span className="truncate max-w-[180px]">{sup.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Catálogo de Produtos Vinculados */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => onNavigateToProducts && onNavigateToProducts(sup.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                        title={`Ver e gerenciar produtos cadastrados de ${sup.razaoSocial}`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>{supProductsCount} {supProductsCount === 1 ? 'produto' : 'produtos'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {sup.condicaoPagamentoPadrao || '30/60/90'}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {sup.percentualNotaPadrao !== undefined ? `${sup.percentualNotaPadrao}%` : '100%'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        
                        {/* Botão Cadastrar Produto com Fornecedor Pré-preenchido */}
                        <button
                          onClick={() => handleOpenCreateProductForSupplier(sup)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition"
                          title={`Cadastrar novo produto vinculado a ${sup.razaoSocial}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Produto</span>
                        </button>

                        {onSelectSupplierForOrder && (
                          <button
                            onClick={() => onSelectSupplierForOrder(sup)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition"
                            title="Iniciar cotação com este fornecedor"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleStartEdit(sup)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          title="Editar cadastro"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            const msg = supProductsCount > 0
                              ? `Deseja realmente excluir o fornecedor "${sup.razaoSocial}"?\n\n⚠️ ATENÇÃO: ${supProductsCount} produto(s) exclusivo(s) deste fornecedor também serão excluídos do catálogo.\n(Produtos de outros fornecedores e o histórico de compras anteriores serão mantidos).`
                              : `Deseja realmente excluir o fornecedor "${sup.razaoSocial}"?`;
                            if (confirm(msg)) {
                              onDeleteSupplier(sup.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                          title="Excluir fornecedor e produtos vinculados"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal: Cadastrar Novo Produto Vinculado ao Fornecedor */}
      {productModalSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cadastrar Produto para {productModalSupplier.razaoSocial}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O produto será vinculado automaticamente a este fornecedor no catálogo
                  </p>
                </div>
              </div>

              <button
                onClick={() => setProductModalSupplier(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveProductFromModal} className="p-6 space-y-4">
              
              {/* Fornecedor Pré-preenchido e Travado */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Fornecedor Vinculado</span>
                    <strong className="text-xs text-slate-900 dark:text-white">{productModalSupplier.razaoSocial}</strong>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Auto-Vinculado
                </span>
              </div>

              {/* Upload de Foto com Suporte a Drag & Drop */}
              <div 
                onDragOver={handleProductPhotoDragOver}
                onDragEnter={handleProductPhotoDragOver}
                onDragLeave={handleProductPhotoDragLeave}
                onDrop={handleProductPhotoDrop}
                className={`p-4 rounded-2xl border-2 border-dashed transition-all duration-200 space-y-3 ${
                  isDraggingPhoto 
                    ? 'border-indigo-500 bg-indigo-100/70 dark:bg-indigo-900/40 ring-4 ring-indigo-400/20 scale-[1.01]' 
                    : 'border-indigo-300/80 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-indigo-950 dark:text-indigo-300 block">
                    Foto do Produto
                  </label>
                  {isDraggingPhoto && (
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
                      Solte a foto aqui!
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div 
                    onClick={() => !newProductData.fotoUrl && fileInputRef.current?.click()}
                    className={`w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 border overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative group ${
                      !newProductData.fotoUrl ? 'cursor-pointer hover:border-indigo-400' : ''
                    } ${isDraggingPhoto ? 'border-indigo-500 ring-2 ring-indigo-400' : 'border-indigo-200 dark:border-indigo-800/60'}`}
                  >
                    {isProcessingPhoto ? (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        <span className="text-[9px] text-slate-500 font-medium">Otimizando...</span>
                      </div>
                    ) : newProductData.fotoUrl ? (
                      <>
                        <img src={newProductData.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewProductData(prev => ({ ...prev, fotoUrl: '' }));
                          }}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-xs"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1 p-2 text-center">
                        <ImageIcon className="w-6 h-6 text-indigo-400" />
                        <span className="text-[9px] font-semibold leading-tight">Arraste ou clique</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 w-full">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingPhoto}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-700 transition disabled:opacity-50"
                    >
                      {isProcessingPhoto ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{isProcessingPhoto ? 'Processando...' : 'Selecionar Imagem do PC'}</span>
                    </button>

                    <input
                      type="text"
                      value={newProductData.fotoUrl || ''}
                      onChange={(e) => setNewProductData(prev => ({ ...prev, fotoUrl: e.target.value }))}
                      placeholder="Ou cole a URL da foto..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Códigos de Identificação */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cód. Interno (SKU Rede) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProductData.codigoInterno || newProductData.codigo || ''}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, codigoInterno: e.target.value, codigo: e.target.value }))}
                    placeholder="Ex: PRD-001"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cód. Fornecedor (Ref)
                  </label>
                  <input
                    type="text"
                    value={newProductData.codigoFornecedor || ''}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, codigoFornecedor: e.target.value }))}
                    placeholder="Ex: REF-1001"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Código de Barras (EAN)
                  </label>
                  <input
                    type="text"
                    value={newProductData.codigoBarras || newProductData.eanBarcode || ''}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, codigoBarras: e.target.value, eanBarcode: e.target.value }))}
                    placeholder="Ex: 7891000100011"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>
              </div>

              {/* Descrição Completa */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Descrição Completa do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={newProductData.descricao || ''}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Ex: Garrafa Térmica Inox 1L..."
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              {/* Categoria, Embalagem & Preços */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={newProductData.categoria || ''}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, categoria: e.target.value }))}
                    placeholder="Ex: Utilidades"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Qtd no Pacote (un/cx) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProductData.qtdPorPacote !== undefined ? newProductData.qtdPorPacote : 12}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setNewProductData(prev => ({ ...prev, qtdPorPacote: isNaN(val) ? 1 : Math.max(1, val) }));
                    }}
                    placeholder="Ex: 12"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Unidades na embalagem</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Preço Compra (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newProductData.precoUnitarioPadrao ? formatCurrency(newProductData.precoUnitarioPadrao, false) : ''}
                    placeholder="0,00"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const { value } = handleCurrencyInput(e.target.value, true);
                      setNewProductData(prev => ({ ...prev, precoUnitarioPadrao: value }));
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    PDV Sugerido (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newProductData.pdvSugerido ? formatCurrency(newProductData.pdvSugerido, false) : ''}
                    placeholder="0,00"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const { value } = handleCurrencyInput(e.target.value, true);
                      setNewProductData(prev => ({ ...prev, pdvSugerido: value }));
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 outline-hidden"
                  />
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductModalSupplier(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Cadastrar e Vincular</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
