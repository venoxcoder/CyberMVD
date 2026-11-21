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
        <div className="flex min-h-screen items-center justify-center bg-[#070b12] p-6 text-[#eaf0f8]">
          <div className="w-full max-w-md rounded-xl border border-[#1f2e45] bg-[#0d1420] p-6">
            <h1 className="text-base font-bold text-[#2dd4bf]">KIBERJINOYATLAR</h1>
            <p className="mt-2 text-xs text-[#a5b5c8]">
              Ошибка инициализации интерфейса / Interface error:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-[#1f2e45] bg-[#070b12] p-3 text-[11px] text-[#ef4444]">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[#2dd4bf] px-4 py-2 text-xs font-bold text-[#041d1b]"
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
