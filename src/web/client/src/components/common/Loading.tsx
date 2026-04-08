import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
  className?: string;
  label?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  fullScreen = false,
  className,
  label,
}) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div
        className={cn(
          'border-primary/20 border-t-primary rounded-full animate-spin',
          sizes[size],
          className
        )}
      />
      {label && (
          <p className="animate-pulse text-sm font-bold text-foreground-muted">{label}</p>
        )}
      </div>
    );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface/80 backdrop-blur-sm animate-in fade-in duration-300">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[100px]">
      {spinner}
    </div>
  );
};
