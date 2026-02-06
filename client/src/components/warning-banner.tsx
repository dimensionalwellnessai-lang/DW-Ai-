import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'wouter';

export interface WarningBannerProps {
  message: string;
  actionLabel?: string;
  actionPath?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
  variant?: 'warning' | 'info' | 'error';
}

export function WarningBanner({
  message,
  actionLabel,
  actionPath,
  onAction,
  onDismiss,
  dismissible = false,
  variant = 'warning',
}: WarningBannerProps) {
  const variantStyles = {
    warning: 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    info: 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    error: 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400',
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
  };

  const content = (
    <Alert className={`${variantStyles[variant]} relative`}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-2">
        <span className="flex-1">{message}</span>
        <div className="flex items-center gap-2">
          {actionLabel && (
            actionPath ? (
              <Link href={actionPath}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleAction}
                >
                  {actionLabel}
                </Button>
              </Link>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={handleAction}
              >
                {actionLabel}
              </Button>
            )
          )}
          {dismissible && onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );

  return content;
}
