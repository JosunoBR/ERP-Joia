import React, { useState, useMemo, useRef } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Image as ImageIcon, 
  Upload, 
  X, 
  Check, 
  Tag, 
  Boxes, 
  DollarSign, 
  Barcode, 
  Filter, 
  Eye, 
  Sparkles,
  RotateCcw,
  LayoutGrid,
  List,
  Building2,
  Package,
  Loader2,
  UploadCloud
} from 'lucide-react';
import { optimizeImageFile } from '../utils/imageUtils';
import { Product, Supplier } from '../shared/types';
import { handleCurrencyInput, formatCurrency } from '../utils/masks';

interface ProductsCatalogPageProps {
  products: Product[];
  suppliers: Supplier[];
  initialSupplierId?: string;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

export const ProductsCatalogPage: React.FC<ProductsCatalogPageProps> = ({
  products,
  suppliers,
  initialSupplierId = 'all',
  onSaveProduct,
  onDeleteProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>(initialSupplierId);
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [draggedOverCardId, setDraggedOverCardId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categorias únicas existentes
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.categoria && p.categoria.trim() !== '') set.add(p.categoria.trim());
    });
    return Array.from(set);
  }, [products]);

  // Filtragem dos produtos por Busca, Categoria E Fornecedor
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const s = searchTerm.toLowerCase();
      const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
      const codForn = (p.codigoFornecedor || '').toLowerCase();
      const codBarras = (p.codigoBarras || p.eanBarcode || '').toLowerCase();
      const desc = p.descricao.toLowerCase();
      const cat = (p.categoria || '').toLowerCase();
      const forn = (p.nomeFornecedor || '').toLowerCase();

      const matchSearch = 
        desc.includes(s) ||
        codInt.includes(s) ||
        codForn.includes(s) ||
        codBarras.includes(s) ||
        cat.includes(s) ||
        forn.includes(s);

      const matchCategory = selectedCategory === 'all' || p.categoria === selectedCategory;

      let matchSupplier = true;
      if (selectedSupplier !== 'all') {
        matchSupplier = p.supplierId === selectedSupplier;
      }

      return matchSearch && matchCategory && matchSupplier;
    });
  }, [products, searchTerm, selectedCategory, selectedSupplier, suppliers]);

  const handleOpenNewProduct = () => {
    const targetSupplier = selectedSupplier !== 'all' 
      ? (suppliers.find(s => s.id === selectedSupplier) || suppliers[0]) 
      : suppliers[0];

    const nextCode = `PRD-${String(products.length + 1).padStart(3, '0')}`;

    setEditingProduct({
      id: 'prod_' + Date.now(),
      codigoInterno: nextCode,
      codigo: nextCode,
      codigoFornecedor: '',
      codigoBarras: '',
      eanBarcode: '',
      descricao: '',
      categoria: selectedCategory !== 'all' ? selectedCategory : 'Utilidades',
      fotoUrl: '',
      qtdPorPacote: 12,
      precoUnitarioPadrao: 0,
      pdvSugerido: 12.00,
      ncm: '',
      supplierId: targetSupplier?.id || '',
      nomeFornecedor: targetSupplier?.razaoSocial || '',
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setIsModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct({ 
      ...prod,
      codigoInterno: prod.codigoInterno || prod.codigo || '',
      codigoFornecedor: prod.codigoFornecedor || '',
      codigoBarras: prod.codigoBarras || prod.eanBarcode || '',
      qtdPorPacote: prod.qtdPorPacote !== undefined && prod.qtdPorPacote !== null ? prod.qtdPorPacote : 12
    });
    setIsModalOpen(true);
  };

  const processProductImageFile = async (file: File) => {
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const base64 = await optimizeImageFile(file, 1200, 1200, 0.88);
      if (base64) {
        setEditingProduct(prev => prev ? { ...prev, fotoUrl: base64 } : null);
      }
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processProductImageFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDraggingPhoto(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingPhoto(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(file.name)) {
        processProductImageFile(file);
        return;
      }
    }

    const textData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
    if (textData && textData.trim().length > 0) {
      setEditingProduct(prev => prev ? { ...prev, fotoUrl: textData.trim() } : null);
    }
  };

  const handleCardPhotoDragOver = (e: React.DragEvent, prodId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedOverCardId !== prodId) setDraggedOverCardId(prodId);
  };

  const handleCardPhotoDragLeave = (e: React.DragEvent, prodId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedOverCardId === prodId) setDraggedOverCardId(null);
  };

  const handleCardPhotoDrop = async (e: React.DragEvent, prod: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverCardId(null);

    let photoUrl = '';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(file.name)) {
        try {
          photoUrl = await optimizeImageFile(file, 1200, 1200, 0.88);
        } catch (err) {
          console.error('Erro ao otimizar foto para o card:', err);
        }
      }
    } else {
      const textData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
      if (textData && textData.trim().length > 0) {
        photoUrl = textData.trim();
      }
    }

    if (photoUrl) {
      onSaveProduct({
        ...prod,
        fotoUrl: photoUrl,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.descricao?.trim()) return;

    const codInterno = editingProduct.codigoInterno?.trim() || editingProduct.codigo?.trim() || `PRD-${Date.now()}`;
    const codForn = editingProduct.codigoFornecedor?.trim() || '';
    const codBarras = editingProduct.codigoBarras?.trim() || editingProduct.eanBarcode?.trim() || '';

    const targetSupplier = suppliers.find(s => s.id === editingProduct.supplierId) || suppliers[0];
    const finalSupplierId = editingProduct.supplierId || targetSupplier?.id || '';
    const finalSupplierNome = editingProduct.nomeFornecedor || targetSupplier?.razaoSocial || targetSupplier?.nomeFantasia || '';

    const fullProduct: Product = {
      id: editingProduct.id || 'prod_' + Date.now(),
      codigoInterno: codInterno,
      codigo: codInterno,
      codigoFornecedor: codForn,
      codigoBarras: codBarras,
      eanBarcode: codBarras,
      descricao: editingProduct.descricao.trim(),
      categoria: editingProduct.categoria?.trim() || 'Geral',
      fotoUrl: editingProduct.fotoUrl || '',
      qtdPorPacote: Math.max(1, Number(editingProduct.qtdPorPacote) || 1),
      precoUnitarioPadrao: Math.max(0, Number(editingProduct.precoUnitarioPadrao) || 0),
      pdvSugerido: editingProduct.pdvSugerido !== undefined ? Number(editingProduct.pdvSugerido) : 12.00,
      ncm: editingProduct.ncm?.trim() || '',
      supplierId: finalSupplierId,
      nomeFornecedor: finalSupplierNome,
      ativo: editingProduct.ativo !== undefined ? editingProduct.ativo : true,
      createdAt: editingProduct.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveProduct(fullProduct);
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSupplierChangeInModal = (supId: string) => {
    const sup = suppliers.find(s => s.id === supId);
    setEditingProduct(prev => prev ? {
      ...prev,
      supplierId: supId,
      nomeFornecedor: sup?.razaoSocial || ''
    } : null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header do Catálogo */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Catálogo & Cadastro de Produtos com Fotos
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono">
                {products.length} {products.length === 1 ? 'Item' : 'Itens'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Banco central de produtos com fotos em alta resolução para compras, cotações e separação nas 20 lojas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNewProduct}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Produto</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Busca, Categorias e Visualização */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs space-y-3">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Busca */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Código, Nome do Produto, Categoria ou Fornecedor..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden font-medium"
            />
          </div>

          {/* Filtro de Fornecedor */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-hidden cursor-pointer"
            >
              <option value="all">🏢 Todos os Fornecedores</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>
                  🏢 {sup.razaoSocial}
                </option>
              ))}
            </select>
          </div>

          {/* Alternador Grid vs Tabela */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewLayout === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Visualização em Grade com Fotos Grandes"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewLayout === 'table'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Visualização em Lista / Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Pílulas de Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-bold shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Categoria:
          </span>

          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Todas ({products.length})
          </button>

          {categoriesList.map(cat => {
            const count = products.filter(p => p.categoria === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

      </div>

      {/* 3. Listagem: Modo Grade Visual (Cards com Fotos) */}
      {viewLayout === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              Nenhum produto encontrado no catálogo para os filtros selecionados.
            </div>
          ) : (
            filteredProducts.map(product => (
              <div
                key={product.id}
                onDragOver={(e) => handleCardPhotoDragOver(e, product.id)}
                onDragEnter={(e) => handleCardPhotoDragOver(e, product.id)}
                onDragLeave={(e) => handleCardPhotoDragLeave(e, product.id)}
                onDrop={(e) => handleCardPhotoDrop(e, product)}
                className={`bg-white dark:bg-slate-800/90 rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative ${
                  draggedOverCardId === product.id 
                    ? 'border-emerald-500 ring-4 ring-emerald-400/30 scale-[1.02]' 
                    : 'border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                {draggedOverCardId === product.id && (
                  <div className="absolute inset-0 z-20 bg-emerald-600/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-3 text-center gap-1.5 animate-in fade-in">
                    <UploadCloud className="w-8 h-8 animate-bounce" />
                    <span className="text-xs font-extrabold">Solte a foto para vincular!</span>
                  </div>
                )}
                <div>
                  {/* Foto do Produto com botão de Zoom */}
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-900/60 overflow-hidden flex items-center justify-center">
                    {product.fotoUrl ? (
                      <img 
                        src={product.fotoUrl} 
                        alt={product.descricao}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setZoomedImage({ url: product.fotoUrl!, title: product.descricao })}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-1">
                        <ImageIcon className="w-10 h-10 stroke-1" />
                        <span className="text-[10px] font-semibold">Sem foto cadastrada</span>
                      </div>
                    )}

                    {/* Tag de Categoria */}
                    {product.categoria && (
                      <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {product.categoria}
                      </span>
                    )}

                    {/* Botão de Zoom */}
                    {product.fotoUrl && (
                      <button
                        onClick={() => setZoomedImage({ url: product.fotoUrl!, title: product.descricao })}
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition opacity-0 group-hover:opacity-100"
                        title="Ver foto ampliada"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Informações do Produto */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-extrabold font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md" title="Código Interno Jóia ERP">
                          {product.codigoInterno || product.codigo || 'S/ CÓD'}
                        </span>
                        {product.codigoFornecedor && (
                          <span className="text-[9px] font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 px-1.5 py-0.5 rounded" title="Código do Fornecedor / Fabricante">
                            Ref: {product.codigoFornecedor}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        Emb: <strong className="text-slate-700 dark:text-slate-300 font-mono">{product.qtdPorPacote} un/cx</strong>
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 min-h-[32px]" title={product.descricao}>
                      {product.descricao}
                    </h3>

                    {/* Código de Barras EAN */}
                    {(product.codigoBarras || product.eanBarcode) && (
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800" title="Código de Barras EAN-13">
                        <Barcode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="tracking-wider">{product.codigoBarras || product.eanBarcode}</span>
                      </div>
                    )}

                    {product.nomeFornecedor && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate" title={product.nomeFornecedor}>
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{product.nomeFornecedor}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preços e Ações */}
                <div className="p-3.5 pt-0">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between mb-2.5">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">Preço de Compra</span>
                      <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                        R$ {Number(product.precoUnitarioPadrao || 0).toFixed(2)}
                      </span>
                    </div>
                    {product.pdvSugerido ? (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">PDV Alvo</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          R$ {Number(product.pdvSugerido).toFixed(2)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditProduct(product)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir o produto "${product.descricao}"?`)) {
                          onDeleteProduct(product.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* 4. Listagem: Modo Tabela */}
      {viewLayout === 'table' && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                  <th className="py-3 px-3 text-center w-14">Foto</th>
                  <th className="py-3 px-3">Cód. Interno</th>
                  <th className="py-3 px-3">Cód. Fornecedor</th>
                  <th className="py-3 px-3">Cód. Barras (EAN)</th>
                  <th className="py-3 px-3">Descrição do Produto</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Fornecedor</th>
                  <th className="py-3 px-3 text-center">Embalagem</th>
                  <th className="py-3 px-3 text-right">Preço Compra</th>
                  <th className="py-3 px-3 text-right">PDV Alvo</th>
                  <th className="py-3 px-3 text-center">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    
                    {/* Foto Miniatura */}
                    <td className="py-2 px-3 text-center">
                      <div 
                        className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer mx-auto"
                        onClick={() => product.fotoUrl && setZoomedImage({ url: product.fotoUrl, title: product.descricao })}
                      >
                        {product.fotoUrl ? (
                          <img 
                            src={product.fotoUrl} 
                            alt="" 
                            loading="lazy" 
                            decoding="async" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </td>

                    {/* Código Interno */}
                    <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {product.codigoInterno || product.codigo || '-'}
                    </td>

                    {/* Código Fornecedor */}
                    <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {product.codigoFornecedor ? (
                        <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                          {product.codigoFornecedor}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Código de Barras EAN */}
                    <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {(product.codigoBarras || product.eanBarcode) ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          {product.codigoBarras || product.eanBarcode}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white max-w-[240px] truncate" title={product.descricao}>
                      {product.descricao}
                    </td>

                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {product.categoria || 'Geral'}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                      {product.nomeFornecedor || '-'}
                    </td>

                    <td className="py-2 px-3 text-center font-mono font-semibold">
                      {product.qtdPorPacote} un/cx
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                      R$ {Number(product.precoUnitarioPadrao || 0).toFixed(2)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {product.pdvSugerido ? `R$ ${Number(product.pdvSugerido).toFixed(2)}` : '-'}
                    </td>

                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditProduct(product)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Deseja excluir "${product.descricao}"?`)) {
                              onDeleteProduct(product.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal de Cadastro & Edição de Produto */}
      {isModalOpen && editingProduct && (
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
                    {editingProduct.id?.startsWith('prod_') && !products.some(p => p.id === editingProduct.id)
                      ? 'Cadastrar Novo Produto no Catálogo'
                      : 'Editar Dados do Produto'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina foto, códigos (interno, fornecedor, barras), embalagem e preços padrão
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              
              {/* Seção de Foto do Produto (Upload & Preview com Drag & Drop) */}
              <div 
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-4 rounded-2xl border-2 border-dashed transition-all space-y-3 ${
                  isDraggingPhoto
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/80 ring-4 ring-emerald-500/20 scale-[1.01]'
                    : 'border-indigo-300/80 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-indigo-950 dark:text-indigo-300 block">
                    Foto do Produto
                  </label>
                  {isDraggingPhoto && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-1">
                      <UploadCloud className="w-3.5 h-3.5" />
                      Solte a imagem aqui!
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  
                  {/* Preview da Foto */}
                  <div 
                    onClick={() => {
                      if (!editingProduct.fotoUrl && !isProcessingPhoto) {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`w-28 h-28 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/60 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative group ${
                      !editingProduct.fotoUrl ? 'cursor-pointer hover:border-indigo-400' : ''
                    }`}
                  >
                    {isProcessingPhoto ? (
                      <div className="text-center p-2 text-indigo-600 dark:text-indigo-400">
                        <Loader2 className="w-6 h-6 mx-auto animate-spin" />
                        <span className="text-[9px] font-bold block mt-1">Carregando...</span>
                      </div>
                    ) : editingProduct.fotoUrl ? (
                      <>
                        <img src={editingProduct.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProduct(prev => prev ? { ...prev, fotoUrl: '' } : null);
                          }}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-xs"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1 p-2 text-center">
                        <ImageIcon className="w-7 h-7 text-indigo-400" />
                        <span className="text-[9px] font-semibold leading-tight">
                          {isDraggingPhoto ? 'Soltar aqui' : 'Arraste ou clique'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Controles de Upload */}
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-700 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Selecionar Foto do Computador</span>
                    </button>

                    <div className="text-[10px] text-slate-400">
                      Ou arraste a imagem diretamente para este quadro, ou cole a URL abaixo:
                    </div>

                    <input
                      type="text"
                      value={editingProduct.fotoUrl || ''}
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, fotoUrl: e.target.value } : null)}
                      placeholder="https://exemplo.com/foto-produto.jpg..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                    />
                  </div>

                </div>
              </div>

              {/* Seção de Códigos de Identificação (Interno, Fornecedor, Barras) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Identificação & Códigos do Produto</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Código Interno */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Código Interno (SKU Rede) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct.codigoInterno || editingProduct.codigo || ''}
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, codigoInterno: e.target.value, codigo: e.target.value } : null)}
                      placeholder="Ex: PRD-001"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">Visível em todas as telas</span>
                  </div>

                  {/* Código Fornecedor */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Código do Fornecedor (Ref)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.codigoFornecedor || ''}
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, codigoFornecedor: e.target.value } : null)}
                      placeholder="Ex: BP-1001"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">Visível na tela de compras</span>
                  </div>

                  {/* Código de Barras EAN */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Código de Barras (EAN-13)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.codigoBarras || editingProduct.eanBarcode || ''}
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, codigoBarras: e.target.value, eanBarcode: e.target.value } : null)}
                      placeholder="Ex: 7891000100011"
                      className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">Catálogo, estoque e separação</span>
                  </div>
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
                  value={editingProduct.descricao || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                  placeholder="Ex: Garrafa Térmica Inox 1L com Termômetro Digital..."
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Fornecedor (Largura Total até o final da tela) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Fornecedor
                </label>
                <select
                  value={editingProduct.supplierId || (suppliers[0]?.id || '')}
                  required
                  onChange={(e) => {
                    const sId = e.target.value;
                    const sObj = suppliers.find(s => s.id === sId);
                    setEditingProduct(prev => prev ? { 
                      ...prev, 
                      supplierId: sId,
                      nomeFornecedor: sObj ? (sObj.razaoSocial || sObj.nomeFantasia || '') : (prev.nomeFornecedor || '')
                    } : null);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {/* Salvaguarda: Se o fornecedor do produto não estiver na lista de suppliers, inclui como opção válida para não forçar outro fornecedor */}
                  {editingProduct.supplierId && !suppliers.some(s => s.id === editingProduct.supplierId) && (
                    <option value={editingProduct.supplierId}>
                      {editingProduct.nomeFornecedor || 'Fornecedor Atual'}
                    </option>
                  )}
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>
                      {sup.razaoSocial} {sup.nomeFantasia ? `(${sup.nomeFantasia})` : ''} {sup.cnpj ? `• ${sup.cnpj}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linha de Categoria, Embalagem, Preço Compra, PDV e NCM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Categoria / Setor
                  </label>
                  <input
                    type="text"
                    value={editingProduct.categoria || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, categoria: e.target.value } : null)}
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
                    value={editingProduct.qtdPorPacote !== undefined ? editingProduct.qtdPorPacote : 12}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setEditingProduct(prev => prev ? { ...prev, qtdPorPacote: isNaN(val) ? 1 : Math.max(1, val) } : null);
                    }}
                    placeholder="Ex: 12"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Unidades na embalagem</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Preço Compra Padrão (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrency(editingProduct.precoUnitarioPadrao || 0)}
                    placeholder="0,00"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const { value } = handleCurrencyInput(e.target.value, false);
                      setEditingProduct(prev => prev ? { ...prev, precoUnitarioPadrao: value } : null);
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Preço de Venda / PDV (R$) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrency(editingProduct.pdvSugerido !== undefined ? editingProduct.pdvSugerido : 12.00)}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const { value } = handleCurrencyInput(e.target.value, false);
                      setEditingProduct(prev => prev ? { ...prev, pdvSugerido: value } : null);
                    }}
                    placeholder="12,00"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Preço no caixa (Padrão R$ 12,00)</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Classificação NCM
                  </label>
                  <input
                    type="text"
                    value={editingProduct.ncm || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, ncm: e.target.value } : null)}
                    placeholder="Ex: 9617.00.10"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar no Catálogo</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. Modal de Zoom de Imagem */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage.url} 
              alt={zoomedImage.title} 
              className="max-h-[70vh] w-auto mx-auto object-contain rounded-2xl" 
            />
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {zoomedImage.title}
              </span>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
