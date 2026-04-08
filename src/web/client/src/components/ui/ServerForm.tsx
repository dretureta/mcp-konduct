import React, { useState } from 'react';
import { Server, CreateServerRequest, TransportType } from '../../types';
import { useI18n } from '../../i18n';

interface ServerFormProps {
  initialData?: Server;
  onSubmit: (data: CreateServerRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ServerForm: React.FC<ServerFormProps> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<CreateServerRequest>({
    name: initialData?.name || '',
    transport: initialData?.transport || 'stdio',
    command: initialData?.command || '',
    args: initialData?.args || [],
    url: initialData?.url || '',
  });

  const [argsString, setArgsString] = useState(initialData?.args?.join(', ') || '');

  const [envString, setEnvString] = useState(
    initialData?.env
      ? Object.entries(initialData.env).map(([k, v]) => `${k}=${v}`).join('\n')
      : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const envRecord: Record<string, string> = {};
    envString.split('\n').map(line => line.trim()).filter(Boolean).forEach(line => {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.substring(0, eqIdx).trim();
        const value = line.substring(eqIdx + 1).trim();
        if (key) envRecord[key] = value;
      }
    });

    const finalData = {
      ...formData,
      args: argsString.split(',').map(a => a.trim()).filter(Boolean),
      env: Object.keys(envRecord).length > 0 ? envRecord : undefined,
    };
    await onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">{t('serverForm.name')}</label>
          <input
            required
            type="text"
            className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all"
            placeholder={t('serverForm.namePlaceholder')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">{t('serverForm.transport')}</label>
          <select
            className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all"
            value={formData.transport}
            onChange={(e) => setFormData({ ...formData, transport: e.target.value as TransportType })}
          >
            <option value="stdio">{t('servers.standardIO')}</option>
            <option value="sse">{t('servers.serverSentinel')}</option>
            <option value="streamable-http">{t('servers.streamableHttp')}</option>
          </select>
        </div>
      </div>

      {formData.transport === 'stdio' ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">{t('serverForm.command')}</label>
            <input
              required
              type="text"
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              placeholder={t('serverForm.namePlaceholder')}
              value={formData.command}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">{t('serverForm.args')}</label>
            <textarea
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              placeholder={t('serverForm.argsPlaceholder')}
              rows={3}
              value={argsString}
              onChange={(e) => setArgsString(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">
              {t('serverForm.envDescription')} <span className="font-normal text-foreground-muted">{t('serverForm.envLineDescription')}</span>
            </label>
            <textarea
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              placeholder={t('serverForm.envPlaceholder')}
              rows={3}
              value={envString}
              onChange={(e) => setEnvString(e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">URL</label>
            <input
              required
              type="url"
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              placeholder={t('serverForm.urlPlaceholder')}
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">
              {t('serverForm.envDescription')} <span className="font-normal text-foreground-muted">{t('serverForm.envLineDescription')}</span>
            </label>
            <textarea
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              placeholder={t('serverForm.envPlaceholder')}
              rows={3}
              value={envString}
              onChange={(e) => setEnvString(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl font-bold text-foreground-muted hover:bg-muted transition-all"
        >
          {t('serverForm.cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary hover:bg-primary-dark text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95 disabled:opacity-50"
        >
          {isLoading ? t('serverForm.saving') : initialData ? t('serverForm.updateServer') : t('serverForm.createServer')}
        </button>
      </div>
    </form>
  );
};