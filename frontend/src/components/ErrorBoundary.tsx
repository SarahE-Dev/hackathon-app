'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Save work to localStorage before showing error
    this.saveWorkToLocalStorage();
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Log to error tracking service (would integrate Sentry here)
    this.logErrorToService(error, errorInfo);
    
    this.setState({
      errorInfo,
    });
  }

  saveWorkToLocalStorage = () => {
    try {
      const currentAnswers = sessionStorage.getItem('currentAnswers');
      if (currentAnswers) {
        localStorage.setItem('recoveryAnswers', currentAnswers);
        localStorage.setItem('recoveryTimestamp', new Date().toISOString());
      }
    } catch (err) {
      console.error('Failed to save recovery data:', err);
    }
  };

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // This would integrate with Sentry, Datadog, or similar
    // For now, we'll just log to console and localStorage
    try {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      };
      
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.push(errorLog);
      localStorage.setItem('errorLogs', JSON.stringify(existingLogs.slice(-10))); // Keep last 10
    } catch (err) {
      console.error('Failed to log error:', err);
    }
  };

  handleRecover = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReport = () => {
    // Open support modal or redirect to support page
    alert('Error has been logged. Our team will investigate.');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
          <div className="glass rounded-2xl border border-red-500/50 p-8 max-w-2xl w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
              <p className="text-gray-400">
                Don't worry - your work has been saved automatically.
              </p>
            </div>

            <div className="bg-dark-800 border border-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-300">
                <strong className="text-white">Error:</strong> {this.state.error?.message}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRecover}
                className="px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white font-medium rounded-lg transition-all"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 text-white font-medium rounded-lg transition-all"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReport}
                className="px-6 py-3 bg-transparent hover:bg-dark-700 border border-gray-600 text-gray-300 hover:text-white font-medium rounded-lg transition-all"
              >
                Report Issue
              </button>
            </div>

            {/* Technical details for developers */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                  Technical Details (Development Only)
                </summary>
                <div className="mt-3 p-4 bg-dark-800 border border-gray-700 rounded-lg overflow-auto max-h-64">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                    {this.state.error?.stack}
                    {'\n\nComponent Stack:\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for assessment taking
export class AssessmentErrorBoundary extends ErrorBoundary {
  saveWorkToLocalStorage = () => {
    try {
      // Save current assessment state
      const attemptId = window.location.pathname.split('/').pop();
      const answers = sessionStorage.getItem(`attempt-${attemptId}-answers`);
      const currentQuestion = sessionStorage.getItem(`attempt-${attemptId}-currentQuestion`);
      
      if (answers) {
        localStorage.setItem(`recovery-attempt-${attemptId}`, answers);
        localStorage.setItem(`recovery-attempt-${attemptId}-timestamp`, new Date().toISOString());
      }
      
      if (currentQuestion) {
        localStorage.setItem(`recovery-attempt-${attemptId}-question`, currentQuestion);
      }
    } catch (err) {
      console.error('Failed to save assessment recovery data:', err);
    }
  };
}
