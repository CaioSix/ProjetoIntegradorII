import { initializeFaro, getWebInstrumentations, faro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

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
  } catch (err) {
    console.warn('Falha ao inicializar telemetria Faro:', err);
  }
}

export { faro };
