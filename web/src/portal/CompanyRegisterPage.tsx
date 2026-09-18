import React, { useState } from 'react';
import {
  Building2,
  Upload,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { portalApi } from './portalApi';

interface CompanyRegisterPageProps {
  onBackToLogin: () => void;
  onRegisteredSuccess: (data: any) => void;
}

export const CompanyRegisterPage: React.FC<CompanyRegisterPageProps> = ({
  onBackToLogin,
  onRegisteredSuccess
}) => {
  // Dados da Empresa
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [ie, setIe] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('PR');
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Dados do Proprietário
  const [ownerNome, setOwnerNome] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerSenha, setOwnerSenha] = useState('');
  const [ownerSenhaConfirm, setOwnerSenhaConfirm] = useState('');
  const [ownerCargo, setOwnerCargo] = useState('Proprietário / Diretor');

  // Estados de Controle
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Máscaras Simples
  const formatCnpj = (val: string) => {
    return val
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 14);
    }
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const formatCep = (val: string) => {
    return val
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

  // Upload de Imagem com Otimização e Redimensionamento (máx 400x400px)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida (PNG, JPG ou SVG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('O arquivo da imagem não deve exceder 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      // Se for SVG, não precisa de canvas
      if (file.type === 'image/svg+xml') {
        setLogoBase64(rawDataUrl);
        setError('');
        return;
      }

      // Redimensionamento inteligente com HTML5 Canvas
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedBase64 = canvas.toDataURL('image/png', 0.9);
          setLogoBase64(optimizedBase64);
        } else {
          setLogoBase64(rawDataUrl);
        }
        setError('');
      };
      img.onerror = () => {
        setError('Falha ao processar imagem selecionada.');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!razaoSocial.trim() || !nomeFantasia.trim() || !cnpj.trim()) {
      setError('Por favor, preencha Razão Social, Nome Fantasia e CNPJ da empresa.');
      return;
    }

    if (!ownerNome.trim() || !ownerEmail.trim() || !ownerSenha.trim()) {
      setError('Por favor, informe Nome, E-mail e Senha para o acesso do Proprietário.');
      return;
    }

    if (ownerSenha.length < 6) {
      setError('A senha do proprietário deve ter no mínimo 6 caracteres.');
      return;
    }

    if (ownerSenha !== ownerSenhaConfirm) {
      setError('A confirmação da senha não coincide com a senha digitada.');
      return;
    }

    setLoading(true);

    try {
      const companyPayload = {
        razaoSocial: razaoSocial.trim(),
        nomeFantasia: nomeFantasia.trim(),
        cnpj: cnpj.trim(),
        ie: ie.trim(),
        email: companyEmail.trim() || ownerEmail.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
        cep: cep.trim(),
        logoBase64: logoBase64 || ''
      };

      const ownerPayload = {
        nome: ownerNome.trim(),
        email: ownerEmail.trim(),
        senha: ownerSenha,
        cargo: ownerCargo.trim()
      };

      const result = await portalApi.registerCompany(companyPayload, ownerPayload);

      setSuccess(true);
      setTimeout(() => {
        onRegisteredSuccess(result);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar empresa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Decorativo com Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto relative z-10">
        {/* Header do Cadastro */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 hover:bg-slate-800 px-4 py-2 rounded-xl border border-slate-800 backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Login
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            Novo Tenant SaaS
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/50">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Cadastre sua Empresa no Jóia ERP
            </h1>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Crie seu ambiente individual seguro na nuvem. Um banco de dados dedicado com sua marca e dados será provisionado automaticamente.
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-200 flex items-start gap-3 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-8 p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold">
                Empresa registrada com sucesso! Inicializando seu banco de dados e preparando seu acesso...
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* SEÇÃO 1: Identidade da Empresa e Logotipo */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">1. Identidade e Logotipo da Empresa</h2>
                  <p className="text-xs text-slate-400">Dados cadastrais oficiais e logotipo do seu negócio</p>
                </div>
              </div>

              {/* Upload de Logotipo */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center bg-slate-900 overflow-hidden relative group shrink-0">
                  {logoBase64 ? (
                    <img src={logoBase64} alt="Preview Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-center p-2">
                      <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-[10px] text-slate-400 block font-medium">Logotipo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <label className="block text-sm font-semibold text-slate-200">
                    Logotipo Oficial da Empresa
                  </label>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sua logo será aplicada automaticamente no cabeçalho do ERP, nas ordens de compra, romaneios de separação e relatórios PDF/Excel. Formato PNG, JPG ou SVG até 5MB.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer transition-colors border border-slate-700">
                    <Upload className="w-3.5 h-3.5" />
                    {logoBase64 ? 'Alterar Imagem da Logo' : 'Selecionar Arquivo de Logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoBase64 && (
                    <button
                      type="button"
                      onClick={() => setLogoBase64('')}
                      className="text-xs text-rose-400 hover:text-rose-300 ml-3 underline cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              {/* Grid de Campos da Empresa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Razão Social <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Comercial Joia Varejista Ltda"
                    value={razaoSocial}
                    onChange={e => setRazaoSocial(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nome Fantasia <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jóia Supermercados"
                    value={nomeFantasia}
                    onChange={e => setNomeFantasia(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    CNPJ <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={e => setCnpj(formatCnpj(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    placeholder="Inscrição Estadual da Matriz"
                    value={ie}
                    onChange={e => setIe(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Telefone Comercial / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={telefone}
                      onChange={e => setTelefone(formatPhone(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    E-mail Corporativo
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      placeholder="contato@empresa.com.br"
                      value={companyEmail}
                      onChange={e => setCompanyEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">CEP</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={cep}
                    onChange={e => setCep(formatCep(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Endereço Completo</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Rua, Número, Bairro / Centro"
                      value={endereco}
                      onChange={e => setEndereco(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Cidade</label>
                  <input
                    type="text"
                    placeholder="Ex: Curitiba"
                    value={cidade}
                    onChange={e => setCidade(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="PR"
                    value={estado}
                    onChange={e => setEstado(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600 uppercase text-center"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Dados do Proprietário (Owner) */}
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">2. Dados de Acesso do Proprietário (Owner)</h2>
                  <p className="text-xs text-slate-400">Credenciais principais para administrar sua empresa no sistema</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nome Completo <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Seu nome completo"
                      value={ownerNome}
                      onChange={e => setOwnerNome(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Cargo / Função
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Proprietário / Diretor Geral"
                      value={ownerCargo}
                      onChange={e => setOwnerCargo(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    E-mail de Login no Portal <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="seu.email@empresa.com.br"
                      value={ownerEmail}
                      onChange={e => setOwnerEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Senha de Acesso <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      value={ownerSenha}
                      onChange={e => setOwnerSenha(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirmar Senha <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Repita a senha"
                      value={ownerSenhaConfirm}
                      onChange={e => setOwnerSenhaConfirm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de Finalização */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                Ao clicar em confirmar, seu banco isolado será gerado imediatamente.
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando Empresa e Banco de Dados...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Concluir Cadastro e Acessar ERP
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
