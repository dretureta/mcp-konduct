import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrows = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-foreground',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-foreground',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-foreground',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-foreground',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-xl bg-foreground px-3 py-1.5 text-xs font-bold text-foreground-inverted shadow-medium animate-in fade-in zoom-in-95 duration-200',
            positions[position],
            className
          )}
        >
          {content}
          <div
            className={cn(
              'absolute border-4 border-transparent',
              arrows[position]
            )}
          />
        </div>
      )}
    </div>
  );
};
