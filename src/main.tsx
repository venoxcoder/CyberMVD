import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#060d18] p-6 text-[#edf2f8]">
          <div className="w-full max-w-md rounded-xl border border-[#1d355b] bg-[#0b162a] p-6">
            <h1 className="text-base font-bold text-[#3b82f6]">KIBERJINOYATLAR</h1>
            <p className="mt-2 text-xs text-[#aabbd2]">
              Ошибка инициализации интерфейса / Interface error:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-[#1d355b] bg-[#060d18] p-3 text-[11px] text-[#ef4444]">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[#3b82f6] px-4 py-2 text-xs font-bold text-white"
            >
              Перезагрузить / Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
