import React from 'react';
import { Sun, Moon, Plus, Bell, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export const Header: React.FC = () => {
  const {
    isDark,
    toggleDarkMode,
    logs,
    searchQuery,
    setSearchQuery,
    filteredServers,
    filteredTools,
    fetchLogs,
  } = useAppContext();
  const navigate = useNavigate();

  const errorCount = logs.filter(l => Number(l.success) === 0).length;
  const showSearchResults = searchQuery.trim().length > 0;
  const topServerResults = filteredServers.slice(0, 5);
  const topToolResults = filteredTools.slice(0, 5);
  const searchContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!showSearchResults) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchQuery('');
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [showSearchResults, setSearchQuery]);

  const handleSearchEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    if (topServerResults.length > 0) {
      navigate('/servers');
    } else if (topToolResults.length > 0) {
      navigate('/tools');
    }
  };

  const goToServersWithSearch = () => {
    navigate('/servers');
    setSearchQuery('');
  };

  const goToToolsWithSearch = () => {
    navigate('/tools');
    setSearchQuery('');
  };

  const openLogsFromNotifications = async () => {
    await fetchLogs({ limit: 50, error: true });
    navigate('/logs');
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border bg-surface/90 px-8 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-72" ref={searchContainerRef}>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchEnter}
            placeholder="Search servers, tools..."
            className="w-full rounded-xl border border-transparent bg-background-subtle py-2 pl-10 pr-4 text-sm text-foreground shadow-soft outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-ring"
          />

          {showSearchResults && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 space-y-2 rounded-2xl border border-border bg-surface p-2 shadow-medium">
              <div className="px-2 pt-1">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground-muted">Servers</p>
              </div>
              {topServerResults.length > 0 ? (
                topServerResults.map((server) => (
                  <button
                    key={server.id}
                    type="button"
                    onClick={goToServersWithSearch}
                    className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-background-subtle"
                  >
                    <p className="truncate text-sm font-bold text-foreground">{server.name}</p>
                    <p className="font-mono text-[10px] uppercase text-foreground-muted">{server.transport}</p>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-foreground-muted">No servers match</p>
              )}

              <div className="px-2 pt-1">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground-muted">Tools</p>
              </div>
              {topToolResults.length > 0 ? (
                topToolResults.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={goToToolsWithSearch}
                    className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-background-subtle"
                  >
                    <p className="truncate text-sm font-bold text-foreground">{tool.toolName}</p>
                    <p className="font-mono text-[10px] uppercase text-foreground-muted">{tool.serverId.substring(0, 8)}</p>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-foreground-muted">No tools match</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="rounded-xl border border-transparent p-2.5 text-foreground-muted transition-all active:scale-95 hover:border-border hover:bg-background-subtle"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun size={20} className="text-warning" /> : <Moon size={20} className="text-foreground-muted" />}
        </button>

        {/* Notifications */}
        <button
          onClick={openLogsFromNotifications}
          className="relative rounded-xl p-2.5 text-foreground-muted transition-all hover:bg-background-subtle"
          aria-label="Open error logs"
        >
          <Bell size={20} />
          {errorCount > 0 && (
            <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-accent text-[10px] font-bold text-accent-foreground">
              {errorCount > 9 ? '9+' : errorCount}
            </span>
          )}
        </button>

        <div className="mx-2 h-8 w-px bg-border"></div>

        {/* Add Server Button */}
        <button 
          onClick={() => navigate('/servers')}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all active:scale-95 hover:bg-primary-dark hover:shadow-glow"
        >
          <Plus size={18} />
          <span>Add Server</span>
        </button>

        {/* Local mode: no user profile needed */}
      </div>
    </header>
  );
};
