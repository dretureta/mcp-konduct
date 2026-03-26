import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, useSidebar } from './Sidebar';
import { Header } from './Header';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MainLayout: React.FC = () => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark overflow-hidden">
      <Sidebar />
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 overflow-hidden h-full",
          isCollapsed ? "md:ml-20" : "md:ml-64",
          "ml-0" // Reset margin on mobile
        )}
      >
        <Header />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
