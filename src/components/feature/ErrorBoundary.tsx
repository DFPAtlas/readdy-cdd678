import { Component, ReactNode } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Forge ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-forge-bg flex items-center justify-center">
          <ErrorState
            title="Application Error"
            message={this.state.error?.message || 'An unexpected error occurred'}
            onRetry={() => this.setState({ hasError: false, error: undefined })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}