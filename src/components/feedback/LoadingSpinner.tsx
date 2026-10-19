import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-6 text-slate-500 ${className}`}>
      <Loader2 className={`${sizeMap[size]} animate-spin text-blue-600`} />
      {text && <span className="text-xs font-medium text-slate-600">{text}</span>}
    </div>
  );
};
