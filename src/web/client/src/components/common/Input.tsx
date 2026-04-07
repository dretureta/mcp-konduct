import React, { forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="ml-1 text-sm font-bold text-foreground">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-12 w-full rounded-xl border-2 bg-surface px-4 py-2 text-sm text-foreground shadow-soft transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-error focus-visible:border-error'
              : 'border-border focus-visible:border-primary',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="ml-1 text-xs font-bold text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="ml-1 text-xs text-foreground-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
