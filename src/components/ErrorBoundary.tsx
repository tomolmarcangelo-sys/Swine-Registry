import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error bound by application:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-lg mx-auto my-12 p-8 bg-white border border-[#DED2AE] rounded-3xl shadow-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-serif font-extrabold text-lg text-[#203F2B]">
              Surveillance View Temporarily Offline
            </h3>
            <p className="text-xs text-[#55604F] leading-relaxed">
              {this.props.fallbackMessage || 'An unexpected rendering conflict occurred during real-time database synchronization. The offline sync engine remains operational.'}
            </p>
            {this.state.error && (
              <pre className="text-[10px] font-mono text-rose-700 bg-rose-50/50 p-3 rounded-xl max-h-32 overflow-auto text-left whitespace-pre-wrap border border-rose-100">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
          </div>

          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#203F2B] hover:bg-[#152a1d] text-white text-xs font-bold rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Stream Feed</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
