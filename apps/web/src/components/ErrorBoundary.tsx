/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 */

import { Component, ReactNode } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: '24px',
        }}>
          <div style={{ maxWidth: '500px', width: '100%' }}>
            <Card>
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <AlertTriangle size={32} style={{ color: '#dc2626' }} />
              </div>
              
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                Something went wrong
              </h2>
              
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
                An unexpected error occurred. Please try refreshing the page or returning to the dashboard.
              </p>

              {this.state.error && (
                <details style={{
                  marginBottom: '24px',
                  padding: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  textAlign: 'left',
                }}>
                  <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#64748b', marginBottom: '8px' }}>
                    Error details
                  </summary>
                  <pre style={{
                    fontSize: '12px',
                    color: '#475569',
                    overflow: 'auto',
                    margin: 0,
                  }}>
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Button onClick={this.handleReset}>
                  <RefreshCw size={16} style={{ marginRight: '8px' }} />
                  Go to Dashboard
                </Button>
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </div>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
