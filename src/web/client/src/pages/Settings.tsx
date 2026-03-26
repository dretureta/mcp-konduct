import React, { useMemo, useState } from 'react';
import { Download, Upload, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Card } from '../components/common/Card.tsx';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Input } from '../components/common/Input.tsx';
import { settingsApi } from '../utils/api';
import { BackupPayload, ImportResponse } from '../types';

type ImportMode = 'merge' | 'replace';

const downloadJson = (filename: string, data: unknown): void => {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const Settings: React.FC = () => {
  const { stats, refreshData } = useAppContext();
  const [mode, setMode] = useState<ImportMode>('merge');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const parsedPayload = useMemo<BackupPayload | null>(() => {
    if (!fileContent.trim()) return null;
    try {
      return JSON.parse(fileContent) as BackupPayload;
    } catch {
      return null;
    }
  }, [fileContent]);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setResultMessage(null);
    try {
      const response = await settingsApi.exportConfig();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadJson(`konduct-backup-${timestamp}.json`, response.data);
      setResultMessage('Configuration exported successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export configuration.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setFileContent(content);
    setFileName(file.name);
    setPreview(null);
    setError(null);
    setResultMessage(null);
  };

  const handlePreview = async () => {
    if (!parsedPayload) {
      setError('Invalid JSON file. Please upload a valid backup file.');
      return;
    }
    setIsPreviewing(true);
    setError(null);
    setResultMessage(null);
    try {
      const response = await settingsApi.previewImport(parsedPayload, mode);
      setPreview(response.data);
      setResultMessage('Preview generated successfully.');
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Failed to preview import.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!parsedPayload) {
      setError('Invalid JSON file. Please upload a valid backup file.');
      return;
    }

    if (mode === 'replace') {
      const confirmed = window.confirm('Replace mode will overwrite current configuration. Continue?');
      if (!confirmed) return;
    }

    setIsApplying(true);
    setError(null);
    setResultMessage(null);
    try {
      const response = await settingsApi.applyImport(parsedPayload, mode);
      setPreview(response.data);
      await refreshData();
      setResultMessage('Import applied successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply import.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage backup, restore, and system preferences</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Backup & Restore</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Export or import your MCP configuration snapshot.</p>
            </div>
            <Badge variant="primary" size="md">konduct-backup-v1</Badge>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExport} isLoading={isExporting}>
              <Download size={18} />
              Export Configuration
            </Button>
          </div>

          <div className="space-y-3">
            <Input
              type="file"
              accept="application/json"
              onChange={handleFileSelection}
              label="Import Backup File"
            />
            {fileName && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Selected file: {fileName}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Import Mode</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'merge' ? 'primary' : 'secondary'}
                onClick={() => setMode('merge')}
              >
                Merge
              </Button>
              <Button
                type="button"
                variant={mode === 'replace' ? 'danger' : 'secondary'}
                onClick={() => setMode('replace')}
              >
                Replace
              </Button>
            </div>
            {mode === 'replace' && (
              <div className="flex items-center gap-2 text-rose-500 text-sm">
                <AlertTriangle size={16} />
                Replace mode overwrites your current configuration.
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              disabled={!fileContent.trim()}
              isLoading={isPreviewing}
            >
              <Upload size={18} />
              Preview Import
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={!fileContent.trim() || !preview?.success}
              isLoading={isApplying}
            >
              Apply Import
            </Button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

          {resultMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 size={16} />
              {resultMessage}
            </div>
          )}

          {preview && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Import Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <Badge variant="secondary">Created: {preview.summary.created}</Badge>
                <Badge variant="secondary">Updated: {preview.summary.updated}</Badge>
                <Badge variant="secondary">Skipped: {preview.summary.skipped}</Badge>
                <Badge variant="secondary">Removed: {preview.summary.removed}</Badge>
                <Badge variant={preview.summary.errors > 0 ? 'danger' : 'success'}>
                  Errors: {preview.summary.errors}
                </Badge>
              </div>
              {preview.messages.length > 0 && (
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-5">
                  {preview.messages.map((message, index) => (
                    <li key={`${message}-${index}`}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Database</h2>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Path</p>
            <p className="text-xs font-mono break-all text-slate-700 dark:text-slate-300">
              {stats?.dbPath || 'Unavailable'}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Status</p>
            <Badge variant={stats?.dbPath ? 'success' : 'secondary'}>
              {stats?.dbPath ? 'Connected' : 'Unknown'}
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  );
};
