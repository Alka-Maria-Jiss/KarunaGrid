import React from 'react';
import { Shield, Home, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('KarunaGrid ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReturnHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  handleResetAndReload = () => {
    try {
      sessionStorage.clear();
      // Keep essential tokens if needed or clear transient state
    } catch (e) {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-serene-bg flex items-center justify-center p-6 text-serene-text antialiased">
          <div className="max-w-md w-full bg-serene-card border border-serene-outline-subtle p-8 rounded-2xl shadow-xl text-center flex flex-col items-center">
            
            {/* Logo Badge */}
            <div className="serene-icon-badge bg-amber-100 text-amber-800 p-4 rounded-2xl mb-6 shadow-md">
              <Shield className="w-8 h-8" />
            </div>

            <span className="serene-tag text-[11px] mb-3">
              KarunaGrid Care Network
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-serene-text mb-3 tracking-tight">
              Something went wrong
            </h1>

            <p className="text-serene-muted text-sm leading-relaxed mb-8 font-medium">
              We encountered an unexpected rendering error. Let's get you back on track safely.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                onClick={this.handleReturnHome}
                className="btn-serene-primary w-full py-3 text-sm font-bold shadow-md flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>

              <button
                onClick={this.handleResetAndReload}
                className="btn-serene-secondary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset &amp; Reload</span>
              </button>
            </div>

            <p className="text-[11px] text-serene-muted mt-6 pt-4 border-t border-serene-outline-subtle/50">
              Need assistance? Contact support at 1-800-KARUNA
            </p>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
