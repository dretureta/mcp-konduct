import React from 'react';
import { Sun, Moon, Plus, Bell, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export const Header: React.FC = () => {
  const {
    isDark,
    toggleDarkMode,
    setIsAddServerModalOpen,
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
    <header className="h-20 bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-72" ref={searchContainerRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchEnter}
            placeholder="Search servers, tools..."
            className="w-full bg-slate-100 dark:bg-slate-800/50 border-transparent focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-xl py-2 pl-10 pr-4 transition-all outline-none text-sm"
          />

          {showSearchResults && (
            <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2 space-y-2">
              <div className="px-2 pt-1">
                <p className="text-[10px] font-black tracking-[0.15em] uppercase text-slate-500">Servers</p>
              </div>
              {topServerResults.length > 0 ? (
                topServerResults.map((server) => (
                  <button
                    key={server.id}
                    type="button"
                    onClick={goToServersWithSearch}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{server.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-mono">{server.transport}</p>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-slate-500">No servers match</p>
              )}

              <div className="px-2 pt-1">
                <p className="text-[10px] font-black tracking-[0.15em] uppercase text-slate-500">Tools</p>
              </div>
              {topToolResults.length > 0 ? (
                topToolResults.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={goToToolsWithSearch}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{tool.toolName}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-mono">{tool.serverId.substring(0, 8)}</p>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-slate-500">No tools match</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-95"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-600" />}
        </button>

        {/* Notifications */}
        <button
          onClick={openLogsFromNotifications}
          className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all relative"
          aria-label="Open error logs"
        >
          <Bell size={20} />
          {errorCount > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-accent text-white text-[10px] flex items-center justify-center rounded-full border-2 border-surface-light dark:border-surface-dark font-bold">
              {errorCount > 9 ? '9+' : errorCount}
            </span>
          )}
        </button>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>

        {/* Add Server Button */}
        <button 
          onClick={() => setIsAddServerModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95"
        >
          <Plus size={18} />
          <span>Add Server</span>
        </button>

        {/* Local mode: no user profile needed */}
      </div>
    </header>
  );
};
