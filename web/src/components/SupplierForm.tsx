import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Check, 
  Phone, 
  User, 
  CreditCard, 
  Percent, 
  MapPin, 
  Mail,
  X
} from 'lucide-react';
import { Supplier, PaymentCondition } from '../shared/types';
import { maskCNPJ, maskPhone } from '../utils/masks';
import { loadPaymentConditions } from '../utils/paymentConditionStorage';

export interface SupplierFormProps {
  initialSupplier?: Supplier | null;
  onSave: (supplierData: Supplier) => void;
  onCancel: () => void;
  title?: string;
  submitText?: string;
  showCardHeader?: boolean;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  initialSupplier,
  onSave,
  onCancel,
  title,
  submitText = 'Salvar',
  showCardHeader = true
}) => {
  const [razaoSocial, setRazaoSocial] = useState(initialSupplier?.razaoSocial || '');
  const [nomeFantasia, setNomeFantasia] = useState(initialSupplier?.nomeFantasia || '');
  const [cnpj, setCnpj] = useState(initialSupplier?.cnpj || '');
  const [vendedorPadrao, setVendedorPadrao] = useState(initialSupplier?.vendedorPadrao || '');
  const [contatoVendedor, setContatoVendedor] = useState(maskPhone(initialSupplier?.contatoVendedor || ''));
  const [telefoneEmpresa, setTelefoneEmpresa] = useState(maskPhone(initialSupplier?.telefoneEmpresa || ''));
  const [email, setEmail] = useState(initialSupplier?.email || '');
  const [endereco, setEndereco] = useState(initialSupplier?.endereco || '');
  const [condicaoPagamentoPadrao, setCondicaoPagamentoPadrao] = useState(initialSupplier?.condicaoPagamentoPadrao || '30/60/90 Dias');
  const [aliquotaStPadrao, setAliquotaStPadrao] = useState<number>(initialSupplier?.aliquotaStPadrao || 0);
  const [aliquotaIpiPadrao, setAliquotaIpiPadrao] = useState<number>(initialSupplier?.aliquotaIpiPadrao || 0);
  const [descontoOffPadrao, setDescontoOffPadrao] = useState<number>(initialSupplier?.descontoOffPadrao || 0);
  const [percentualNotaPadrao, setPercentualNotaPadrao] = useState<number>(
    initialSupplier?.percentualNotaPadrao !== undefined ? initialSupplier.percentualNotaPadrao : 100
  );
  const [observacoesDescarga, setObservacoesDescarga] = useState(initialSupplier?.observacoesDescarga || '');
  const [paymentConditions, setPaymentConditions] = useState<PaymentCondition[]>([]);
  const [isCustomPayment, setIsCustomPayment] = useState(false);

  useEffect(() => {
    loadPaymentConditions(false).then(list => {
      if (Array.isArray(list) && list.length > 0) {
        setPaymentConditions(list);
      }
    }).catch(err => {
      console.error('[SupplierForm] Erro ao carregar condições de pagamento:', err);
    });
  }, []);

  useEffect(() => {
    if (initialSupplier) {
      setRazaoSocial(initialSupplier.razaoSocial || '');
      setNomeFantasia(initialSupplier.nomeFantasia || '');
      setCnpj(initialSupplier.cnpj || '');
      setVendedorPadrao(initialSupplier.vendedorPadrao || '');
      setContatoVendedor(maskPhone(initialSupplier.contatoVendedor || ''));
      setTelefoneEmpresa(maskPhone(initialSupplier.telefoneEmpresa || ''));
      setEmail(initialSupplier.email || '');
      setEndereco(initialSupplier.endereco || '');
      setCondicaoPagamentoPadrao(initialSupplier.condicaoPagamentoPadrao || '30/60/90 Dias');
      setIsCustomPayment(false);
      setAliquotaStPadrao(initialSupplier.aliquotaStPadrao || 0);
      setAliquotaIpiPadrao(initialSupplier.aliquotaIpiPadrao || 0);
      setDescontoOffPadrao(initialSupplier.descontoOffPadrao || 0);
      setPercentualNotaPadrao(initialSupplier.percentualNotaPadrao !== undefined ? initialSupplier.percentualNotaPadrao : 100);
      setObservacoesDescarga(initialSupplier.observacoesDescarga || '');
    } else {
      setRazaoSocial('');
      setNomeFantasia('');
      setCnpj('');
      setVendedorPadrao('');
      setContatoVendedor('');
      setTelefoneEmpresa('');
      setEmail('');
      setEndereco('');
      setCondicaoPagamentoPadrao('30/60/90 Dias');
      setIsCustomPayment(false);
      setAliquotaStPadrao(0);
      setAliquotaIpiPadrao(0);
      setDescontoOffPadrao(0);
      setPercentualNotaPadrao(100);
      setObservacoesDescarga('');
    }
  }, [initialSupplier]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim()) return;

    const supplierData: Supplier = {
      id: initialSupplier?.id || 'sup_' + Date.now(),
      razaoSocial: razaoSocial.trim(),
      nomeFantasia: nomeFantasia.trim() || undefined,
      cnpj: cnpj.trim() || undefined,
      vendedorPadrao: vendedorPadrao.trim() || undefined,
      contatoVendedor: contatoVendedor.trim() || undefined,
      telefoneEmpresa: telefoneEmpresa.trim() || undefined,
      email: email.trim() || undefined,
      endereco: endereco.trim() || undefined,
      condicaoPagamentoPadrao: condicaoPagamentoPadrao.trim() || undefined,
      aliquotaStPadrao: Number(aliquotaStPadrao) || 0,
      aliquotaIpiPadrao: Number(aliquotaIpiPadrao) || 0,
      descontoOffPadrao: Number(descontoOffPadrao) || 0,
      percentualNotaPadrao: percentualNotaPadrao !== undefined ? Number(percentualNotaPadrao) : 100,
      observacoesDescarga: observacoesDescarga.trim() || undefined,
      createdAt: initialSupplier?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(supplierData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showCardHeader && (
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{title || (initialSupplier ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor')}</span>
          </h4>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition cursor-pointer"
          >
            Voltar para a lista
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {/* Razão Social */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Razão Social / Nome da Empresa *
          </label>
          <input
            type="text"
            required
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            placeholder="Ex: Plásticos & Utilidades do Brasil Ltda"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
          />
        </div>

        {/* Nome Fantasia */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nome Fantasia
          </label>
          <input
            type="text"
            value={nomeFantasia}
            onChange={(e) => setNomeFantasia(e.target.value)}
            placeholder="Ex: Brasil Plásticos"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        {/* CNPJ */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            CNPJ
          </label>
          <input
            type="text"
            value={cnpj}
            onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
            placeholder="00.000.000/0001-00"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
          />
        </div>

        {/* Vendedor */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Vendedor / Representante
          </label>
          <input
            type="text"
            value={vendedorPadrao}
            onChange={(e) => setVendedorPadrao(e.target.value)}
            placeholder="Nome do contato"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        {/* Contato Vendedor */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            Telefone / WhatsApp
          </label>
          <input
            type="text"
            value={contatoVendedor}
            onChange={(e) => setContatoVendedor(maskPhone(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
          />
        </div>

        {/* Condição de Pagamento Padrão */}
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              Condição de Pagamento Padrão
            </label>
            {isCustomPayment && (
              <button
                type="button"
                onClick={() => {
                  setIsCustomPayment(false);
                  setCondicaoPagamentoPadrao('30/60/90 Dias');
                }}
                className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Voltar à lista
              </button>
            )}
          </div>

          {!isCustomPayment ? (
            <div className="relative">
              <select
                value={condicaoPagamentoPadrao}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomPayment(true);
                    setCondicaoPagamentoPadrao('');
                  } else {
                    setCondicaoPagamentoPadrao(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold cursor-pointer"
              >
                <option value="">Selecione a condição de pagamento...</option>
                {paymentConditions.map(c => (
                  <option key={c.id} value={c.descricao}>
                    {c.descricao} {c.qtdParcelas ? `(${c.qtdParcelas}x • ${c.especie || 'Boleto'})` : ''}
                  </option>
                ))}
                {condicaoPagamentoPadrao && !paymentConditions.some(c => c.descricao.toLowerCase() === condicaoPagamentoPadrao.toLowerCase()) && (
                  <option value={condicaoPagamentoPadrao}>
                    {condicaoPagamentoPadrao} (Personalizada)
                  </option>
                )}
                <option value="__custom__">+ Digitar outra condição personalizada...</option>
              </select>
            </div>
          ) : (
            <input
              type="text"
              autoFocus
              value={condicaoPagamentoPadrao}
              onChange={(e) => setCondicaoPagamentoPadrao(e.target.value)}
              placeholder="Ex: 30/60/90 Dias"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
            />
          )}
        </div>

        {/* OFF % */}
        <div className="bg-blue-50/70 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/50">
          <label className="block text-xs font-bold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-blue-600" />
            OFF %
          </label>
          <div className="relative">
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={percentualNotaPadrao === 0 ? '' : percentualNotaPadrao}
              placeholder="100"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPercentualNotaPadrao(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 font-bold font-mono pr-7"
            />
            <span className="absolute right-2.5 top-1.5 text-xs font-bold text-blue-500 pointer-events-none">%</span>
          </div>
          <span className="text-[10px] text-blue-700 dark:text-blue-400 mt-1 block">
            Define o percentual de OFF no pedido
          </span>
        </div>

        {/* Telefone da Empresa */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            Telefone da Empresa
          </label>
          <input
            type="text"
            value={telefoneEmpresa}
            onChange={(e) => setTelefoneEmpresa(maskPhone(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
          />
        </div>

        {/* E-mail da Empresa / Contato */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            E-mail do Fornecedor
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@fornecedor.com.br"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        {/* Endereço */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            Endereço
          </label>
          <input
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Ex: Av. Brasil, 1500 - Centro, Curitiba - PR"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        {/* Descrição / Observações */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Descrição do Fornecedor / Observações
          </label>
          <textarea
            rows={2}
            value={observacoesDescarga}
            onChange={(e) => setObservacoesDescarga(e.target.value)}
            placeholder="Anotações gerais, acordos comerciais, restrições ou observações sobre o fornecedor."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="px-6 py-2 text-xs font-extrabold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>{submitText}</span>
        </button>
      </div>
    </form>
  );
};
