// Example atom component demonstrating the atomic design pattern
// Atoms are the basic building blocks of the UI

import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

/**
 * Icon component - wrapper for SVG icons with consistent sizing
 * @example
 * <Icon name="check" size="md" className="text-green-500" />
 */
export function Icon({ size = 'md', className, ...props }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}
