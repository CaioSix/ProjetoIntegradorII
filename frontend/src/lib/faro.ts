import { initializeFaro, getWebInstrumentations, faro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

let currentView = 'Inicial';

export function getCurrentView() {
  return currentView;
}

export function reportError(err: unknown, extraContext: Record<string, string> = {}) {
  try {
    const errorObj =
      err instanceof Error ? err : new Error(String((err as any)?.message || err));
    console.error(`[Erro na tela: ${currentView}]`, errorObj);
    faro.api?.pushError(errorObj, {
      context: {
        page: currentView,
        ...extraContext,
      },
    });
  } catch {
    // Ignora falhas internas de telemetria
  }
}

export function initFaro() {
  const collectorUrl =
    import.meta.env.VITE_FARO_URL || `${window.location.origin}/collect`;

  try {
    initializeFaro({
      url: collectorUrl,
      app: {
        name: 'boletim-web-frontend',
        version: '1.0.0',
        environment: import.meta.env.MODE,
      },
      instrumentations: [
        ...getWebInstrumentations({
          captureConsole: true,
        }),
        new TracingInstrumentation(),
      ],
    });

    // Captura rejeições de Promises não tratadas fora do ciclo do React
    window.addEventListener('unhandledrejection', (event) => {
      reportError(event.reason || 'Unhandled Promise Rejection', {
        source: 'unhandledrejection',
      });
    });
  } catch (err) {
    console.warn('Falha ao inicializar telemetria Faro:', err);
  }
}

export function trackPageView(pageName: string) {
  try {
    currentView = pageName;
    faro.api?.setView({ name: pageName });
    faro.api?.pushEvent('page_view', { page: pageName });
  } catch {
    // Ignora falhas de telemetria para nunca afetar a navegação
  }
}

export { faro };
