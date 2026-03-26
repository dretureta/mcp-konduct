import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Folder, ExternalLink } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/common/Card.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Input } from '../components/common/Input.tsx';
import { Loading } from '../components/common/Loading.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Tooltip } from '../components/common/Tooltip.tsx';

export const Projects: React.FC = () => {
  const { projects, isLoading, createProject, deleteProject } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createProject(newProjectName);
      setNewProjectName('');
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && projects.length === 0) {
    return <Loading label="Syncing projects..." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Projects</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Group your servers into logical projects</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto"
        >
          <Plus size={20} />
          <span>New Project</span>
        </Button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Project">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Project Name"
            required
            autoFocus
            placeholder="e.g., Marketing AI, Dev Environment"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            helperText="A clear, concise name for your collection of servers."
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !newProjectName.trim()}
              isLoading={isSubmitting}
            >
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      {projects.length === 0 ? (
        <EmptyState 
          icon={Briefcase}
          title="No projects found"
          description="Projects allow you to organize and manage groups of MCP servers together. Create your first project to get started."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={20} />
              Create Your First Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} hover className="group h-full flex flex-col">
              <div className="p-6 flex-1 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <Folder size={24} />
                  </div>
                  <Tooltip content="Delete Project">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm('Delete this project? This will not delete the connected servers.')) {
                          deleteProject(project.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </Tooltip>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{project.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {project.description || 'No description provided for this project.'}
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-b-2xl">
                <Badge variant="secondary" size="md">
                  {project.serverCount || 0} Servers
                </Badge>
                <Button variant="ghost" size="sm" className="text-primary font-bold hover:gap-2 transition-all">
                  Manage <ExternalLink size={14} className="ml-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
