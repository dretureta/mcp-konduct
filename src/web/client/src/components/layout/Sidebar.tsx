import React, { createContext, useContext, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Server, Wrench, Briefcase, Terminal, Settings, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Server, label: 'Servers', path: '/servers' },
  { icon: Wrench, label: 'Tools', path: '/tools' },
  { icon: Briefcase, label: 'Projects', path: '/projects' },
  { icon: Terminal, label: 'Logs', path: '/logs' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within SidebarProvider');
  return context;
};

export const Sidebar: React.FC = () => {
  const { isCollapsed, setIsCollapsed, isOpen, setIsOpen } = useSidebar();
  const location = useLocation();

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location, setIsOpen]);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[60] p-2 bg-primary text-white rounded-lg shadow-lg md:hidden"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50",
          "md:translate-x-0", // Visible on desktop
          isOpen ? "translate-x-0 w-64" : "-translate-x-full md:w-64", // Mobile state
          !isOpen && isCollapsed ? "md:w-20" : "md:w-64" // Desktop collapsed state
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            {(!isCollapsed || isOpen) && (
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white truncate">
                konduct
              </span>
            )}
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary"
                  )
                }
              >
                <item.icon size={20} className="shrink-0" />
                {(!isCollapsed || isOpen) && <span className="font-medium">{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Footer/Collapse (Desktop Only) */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 hidden md:block">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
