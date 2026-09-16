import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F1F5F9] font-sans overflow-hidden">
      <div className="hidden md:flex w-[400px] lg:w-[500px] bg-[#1E293B] p-12 flex-col justify-between text-white relative overflow-hidden shrink-0">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500 rounded-full opacity-10"></div>
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-indigo-600 rounded-full opacity-10"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight uppercase">EduTrack<span className="text-blue-400">Pro</span></span>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight mb-6">Gestão Acadêmica de Próxima Geração.</h1>
          <p className="text-slate-400 text-lg leading-relaxed">Acompanhe o desempenho de seus alunos em tempo real.</p>
        </div>

        <div className="relative z-10">
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Status do Sistema</span>
            </div>
            <p className="text-sm text-slate-400">Conectado à <span className="text-white font-medium">API</span></p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-end gap-6 shrink-0">
          <span className="text-sm text-slate-500">Precisa de ajuda?</span>
          <button className="text-sm font-semibold text-slate-900 border border-slate-300 px-4 py-2 rounded-md hover:bg-slate-50">Documentação</button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-[440px]">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Acesse o Portal</h2>
              <p className="text-slate-500">Insira suas credenciais para gerenciar turmas e notas.</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Endereço de E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="professor@escola.com.br"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Senha</label>
                  <a href="#" className="text-xs text-blue-600 font-medium hover:underline">Esqueceu a senha?</a>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="remember" className="text-sm text-slate-600">Manter sessão ativa por 30 dias</label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors flex justify-center items-center disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar no Painel'}
              </button>
            </form>
          </div>
        </main>

        <footer className="p-8 flex justify-between items-center text-xs text-slate-400 mt-auto shrink-0">
          <span>&copy; {new Date().getFullYear()} EduTrack Pro. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-600">Termos de Uso</a>
            <a href="#" className="hover:text-slate-600">Privacidade</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
