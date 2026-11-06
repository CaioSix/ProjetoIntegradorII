import { createClient } from '@supabase/supabase-js';
import { faro } from './faro';

// Credenciais do Supabase obtidas exclusivamente das variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options) => {
      const start = performance.now();
      const method = options?.method || 'GET';
      const rawUrl = typeof url === 'string' ? url : url.toString();
      const path = supabaseUrl ? rawUrl.replace(supabaseUrl, '').split('?')[0] : rawUrl;

      try {
        const response = await fetch(url, options);
        const duration = Math.round(performance.now() - start);

        // Registra toda chamada ao Supabase (login, notas, faltas, alunos)
        faro.api?.pushEvent('supabase_request', {
          path,
          method,
          status: String(response.status),
          duration_ms: String(duration),
        });

        // Se o Supabase retornar erro HTTP (4xx / 5xx), registra no console/Faro
        if (!response.ok) {
          console.error(`Erro Supabase [${method} ${path}]: status ${response.status}`);
        }

        return response;
      } catch (err: any) {
        const duration = Math.round(performance.now() - start);
        console.error(`Falha de rede no Supabase [${method} ${path}] (${duration}ms):`, err);
        faro.api?.pushError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
  },
});
