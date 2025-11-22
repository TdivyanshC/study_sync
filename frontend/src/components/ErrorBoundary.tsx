/**
 * React Error Boundary Components for Comprehensive Error Handling
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

// Error boundary props
interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

// Error fallback component props
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorInfo?: ErrorInfo;
}

// Generic error boundary component
export class ErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean; error?: Error; errorInfo?: ErrorInfo }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (if configured)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Log to console for development
      if (__DEV__) {
        console.group('🚨 Error Report');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('Component Stack:', errorInfo.componentStack);
        console.groupEnd();
      }

      // Here you could integrate with error tracking services like:
      // - Sentry
      // - Bugsnag
      // - LogRocket
      // - Custom error reporting service
      
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
            errorInfo={this.state.errorInfo}
          />
        );
      }

      // Default error fallback
      return <DefaultErrorFallback 
        error={this.state.error} 
        resetError={this.resetError}
        errorInfo={this.state.errorInfo}
        showDetails={this.props.showDetails}
      />;
    }

    return this.props.children;
  }
}

// Network error boundary component
export class NetworkErrorBoundary extends Component<ErrorBoundaryProps, { isNetworkError: boolean; error?: Error }> {
  constructor(props: any) {
    super(props);
    this.state = { isNetworkError: false };
  }

  static getDerivedStateFromError(error: Error): { isNetworkError: boolean; error: Error } {
    // Check if error is network-related
    const isNetworkError = 
      error.message.includes('Network request failed') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network Error') ||
      error.message.includes('fetch') ||
      error.name === 'TypeError';

    return { isNetworkError, error };
  }

  render() {
    if (this.state.isNetworkError) {
      return <NetworkErrorFallback error={this.state.error!} resetError={() => this.setState({ isNetworkError: false })} />;
    }

    return this.props.children;
  }
}

// Validation error boundary component
export class ValidationErrorBoundary extends Component<ErrorBoundaryProps, { validationErrors: Record<string, string[]> }> {
  constructor(props: any) {
    super(props);
    this.state = { validationErrors: {} };
  }

  static getDerivedStateFromError(error: Error): { validationErrors?: Record<string, string[]> } {
    // Check if error contains validation errors
    if (error.message.includes('ValidationError') || error.message.includes('validation')) {
      // Parse validation errors if present
      const validationErrors: Record<string, string[]> = {};
      
      return { validationErrors };
    }
    
    return {};
  }

  render() {
    if (this.state.validationErrors && Object.keys(this.state.validationErrors).length > 0) {
      return (
        <ValidationErrorFallback 
          errors={this.state.validationErrors}
          resetError={() => this.setState({ validationErrors: {} })}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps & { showDetails?: boolean }> = ({ 
  error, 
  resetError, 
  errorInfo,
  showDetails = false 
}) => {
  const handleReportError = () => {
    Alert.alert(
      'Report Error',
      'Would you like to report this error? This helps us improve the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report', 
          onPress: () => {
            // In a real app, this would send error data to a reporting service
            Alert.alert('Thank you', 'Error report sent. We\'ll look into this issue.');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>😵</Text>
        <Text style={styles.title}>Oops! Something went wrong</Text>
        <Text style={styles.message}>
          We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={resetError}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleReportError}>
          <Text style={styles.secondaryButtonText}>Report Issue</Text>
        </TouchableOpacity>

        {showDetails && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Error Details:</Text>
            <Text style={styles.errorText}>{error.message}</Text>
            {error.stack && (
              <Text style={styles.stackText} numberOfLines={10}>
                {error.stack}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

// Network error fallback component
const NetworkErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const handleRetry = () => {
    resetError();
  };

  const handleOfflineMode = () => {
    // Handle offline mode activation
    Alert.alert(
      'Offline Mode',
      'Switching to offline mode. Some features may be limited.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>📡</Text>
        <Text style={styles.title}>Connection Problem</Text>
        <Text style={styles.message}>
          We couldn't connect to our servers. Please check your internet connection and try again.
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={handleRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleOfflineMode}>
          <Text style={styles.secondaryButtonText}>Use Offline Mode</Text>
        </TouchableOpacity>

        <Text style={styles.errorText}>
          {error?.message || 'Network connection failed'}
        </Text>
      </View>
    </View>
  );
};

// Validation error fallback component
const ValidationErrorFallback: React.FC<{ errors: Record<string, string[]>; resetError: () => void }> = ({ 
  errors, 
  resetError 
}) => {
  const errorCount = Object.values(errors).flat().length;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Validation Error</Text>
        <Text style={styles.message}>
          There {errorCount === 1 ? 'is' : 'are'} {errorCount} validation error{errorCount === 1 ? '' : 's'} that need to be fixed.
        </Text>
        
        <View style={styles.errorsList}>
          {Object.entries(errors).map(([field, fieldErrors]) => (
            <View key={field} style={styles.errorItem}>
              <Text style={styles.errorField}>{field}:</Text>
              {fieldErrors.map((error, index) => (
                <Text key={index} style={styles.errorMessage}>{error}</Text>
              ))}
            </View>
          ))}
        </View>
        
        <TouchableOpacity style={styles.button} onPress={resetError}>
          <Text style={styles.buttonText}>Fix Errors</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#ff3b30',
    textAlign: 'center',
    marginTop: 12,
  },
  errorsList: {
    width: '100%',
    marginBottom: 24,
  },
  errorItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff3b30',
  },
  errorField: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  detailsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: '100%',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

// Higher-order component for error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error handling
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError, error };
}

export default ErrorBoundary;