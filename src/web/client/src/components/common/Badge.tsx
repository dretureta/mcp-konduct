import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'sm',
  ...props
}) => {
  const variants = {
    primary: 'bg-primary/12 text-primary border-primary/20',
    secondary: 'bg-muted text-foreground border-border',
    success: 'bg-success-soft text-success border-success-border',
    danger: 'bg-danger-soft text-danger border-danger-border',
    warning: 'bg-warning-soft text-warning border-warning-border',
    info: 'bg-info-soft text-info border-info-border',
    outline: 'bg-transparent border-2 border-border text-foreground-muted',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold uppercase tracking-wider rounded-full border transition-all duration-300',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
