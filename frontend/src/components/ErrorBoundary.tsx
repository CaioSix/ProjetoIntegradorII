import React from 'react';
import { getCurrentView, reportError } from '../lib/faro';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Erro inesperado ao renderizar componente.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportError(error, {
      type: 'react_component_crash',
      page: getCurrentView(),
      componentStack: errorInfo.componentStack || 'unknown',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-red-100">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Algo deu errado nesta tela</h2>
            <p className="text-sm text-gray-600 mb-6">{this.state.errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
