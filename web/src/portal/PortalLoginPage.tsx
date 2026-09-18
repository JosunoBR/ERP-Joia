import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  Building2,
  ShieldCheck,
  AlertCircle,
  Gem
} from 'lucide-react';
import { portalApi } from './portalApi';

interface PortalLoginPageProps {
  onGoToRegister: () => void;
  onLoginSuccess: (authData: any) => void;
}

export const PortalLoginPage: React.FC<PortalLoginPageProps> = ({
  onGoToRegister,
  onLoginSuccess
}) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !senha) {
      setError('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    setLoading(true);

    try {
      const result = await portalApi.login(email.trim(), senha);
      onLoginSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar no portal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Luzes de fundo / Ambient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Logo / Brand do Portal */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-950/50 mb-4 ring-1 ring-white/20">
            <Gem className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Jóia ERP
          </h1>
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mt-1">
            Portal Central de Gestão & Multi-Tenant
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Acesse o ambiente seguro da sua empresa ou cadastre um novo negócio
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 flex items-start gap-2.5 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@empresa.com.br"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Senha
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Sua senha secreta"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Identificando Empresa...
                </>
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">
                Novo Cliente?
              </span>
            </div>
          </div>

          {/* Botão de Cadastro de Empresa */}
          <button
            type="button"
            onClick={onGoToRegister}
            className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            Cadastrar Minha Empresa
          </button>
        </div>

        {/* Rodapé Informativo */}
        <div className="mt-8 text-center space-y-2 text-xs text-slate-500">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Isolamento Total de Dados por Empresa (Multi-Tenant)</span>
          </div>
          <p>© {new Date().getFullYear()} Jóia ERP • Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
};
