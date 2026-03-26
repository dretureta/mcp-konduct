import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Input } from '../common/Input';

export const AddServerModal: React.FC = () => {
  const { isAddServerModalOpen, setIsAddServerModalOpen, addServer } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    transport: 'stdio' as 'stdio' | 'sse',
    command: '',
    url: '',
    args: ''
  });

  if (!isAddServerModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const args = formData.args.split(' ').filter(a => a.trim() !== '');
    await addServer({
      name: formData.name,
      transport: formData.transport,
      command: formData.transport === 'stdio' ? formData.command : undefined,
      url: formData.transport === 'sse' ? formData.url : undefined,
      args: formData.transport === 'stdio' ? args : undefined
    });
    setIsAddServerModalOpen(false);
    // Reset form
    setFormData({
      name: '',
      transport: 'stdio',
      command: '',
      url: '',
      args: ''
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Add New Server</h3>
            <button type="button" onClick={() => setIsAddServerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <Input 
              label="Server Name" 
              placeholder="e.g., Python Filesystem" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
            />
            <div className="grid grid-cols-2 gap-2">
              <Button 
                type="button" 
                variant={formData.transport === 'stdio' ? 'primary' : 'secondary'} 
                onClick={() => setFormData({...formData, transport: 'stdio'})} 
                className="w-full"
              >
                STDIO
              </Button>
              <Button 
                type="button" 
                variant={formData.transport === 'sse' ? 'primary' : 'secondary'} 
                onClick={() => setFormData({...formData, transport: 'sse'})} 
                className="w-full"
              >
                SSE
              </Button>
            </div>
            {formData.transport === 'stdio' ? (
              <>
                <Input 
                  label="Command" 
                  placeholder="npx, python3, etc." 
                  value={formData.command} 
                  onChange={e => setFormData({...formData, command: e.target.value})} 
                  required 
                />
                <Input 
                  label="Arguments" 
                  placeholder="--port 8080 (space separated)" 
                  value={formData.args} 
                  onChange={e => setFormData({...formData, args: e.target.value})} 
                />
              </>
            ) : (
              <Input 
                label="URL" 
                placeholder="https://..." 
                value={formData.url} 
                onChange={e => setFormData({...formData, url: e.target.value})} 
                required 
              />
            )}
          </div>
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsAddServerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Server
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
