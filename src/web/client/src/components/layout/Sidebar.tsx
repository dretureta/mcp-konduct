import React, { createContext, useContext, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Server, Wrench, Briefcase, Terminal, Settings, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useI18n } from '../../i18n';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: '/' },
  { icon: Server, labelKey: 'nav.servers', path: '/servers' },
  { icon: Wrench, labelKey: 'nav.tools', path: '/tools' },
  { icon: Briefcase, labelKey: 'nav.projects', path: '/projects' },
  { icon: Terminal, labelKey: 'nav.logs', path: '/logs' },
  { icon: Settings, labelKey: 'nav.settings', path: '/settings' },
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
  const { t } = useI18n();

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location, setIsOpen]);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-[60] rounded-xl bg-primary p-2 text-primary-foreground shadow-soft md:hidden"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full border-r border-border bg-surface transition-all duration-300",
          "md:translate-x-0", // Visible on desktop
          isOpen ? "translate-x-0 w-64" : "-translate-x-full md:w-64", // Mobile state
          !isOpen && isCollapsed ? "md:w-20" : "md:w-64" // Desktop collapsed state
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center gap-3 p-6">
            {(!isCollapsed || isOpen) && (
              <div className="min-w-0">
                <span className="block truncate text-lg font-bold tracking-tight text-foreground">
                  konduct
                </span>
                <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-foreground-muted">
                  MCP Router
                </span>
              </div>
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
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-foreground-muted hover:bg-background-subtle hover:text-primary"
                  )
                }
              >
                <item.icon size={20} className="shrink-0" />
                {(!isCollapsed || isOpen) && <span className="font-medium">{t(item.labelKey)}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Footer/Collapse (Desktop Only) */}
          <div className="hidden border-t border-border p-4 md:block">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex w-full items-center justify-center rounded-xl p-2 text-foreground-muted transition-colors hover:bg-background-subtle"
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};