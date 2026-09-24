/**
 * Error State Component
 */

import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = 'Something went wrong', 
  message = 'Unable to load data. Please try again.',
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="error-state">
      <div className="error-state-icon">
        <AlertCircle size={32} />
      </div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="small">
          Try Again
        </Button>
      )}
    </div>
  );
}
