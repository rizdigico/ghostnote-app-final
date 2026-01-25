import { ReactNode, ErrorInfo, Component } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Log to error tracking service in production
    if (import.meta.env.PROD) {
      // Example: Send to Sentry, LogRocket, etc.
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="bg-surface border border-border rounded-lg p-8 max-w-md text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold text-textMain mb-2">Something went wrong</h1>
            <p className="text-textMuted mb-6">
              We're sorry for the inconvenience. The application encountered an unexpected error.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-background rounded p-4 mb-6 text-left text-sm font-mono text-red-400 overflow-auto max-h-40">
                <p className="font-bold mb-2">Error Details (Dev Mode):</p>
                <p>{this.state.error.message}</p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-accent hover:bg-accentHover text-background font-semibold py-2 px-6 rounded transition-colors duration-200"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
