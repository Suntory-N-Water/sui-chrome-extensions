import { Button } from '@sui-chrome-extensions/ui';
import { Download, LayoutDashboard } from 'lucide-react';
import packageJson from '../../package.json';

type ViewType = 'collection' | 'dashboard';

type SidebarProps = {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
};

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className='w-64 h-screen fixed left-0 top-0 glass-panel border-r border-white/20 z-50 flex flex-col p-6'>
      <div className='mb-10'>
        <h1 className='text-2xl font-bold bg-linear-to-r from-primary to-secondary-foreground bg-clip-text text-transparent'>
          Heavenly
          <br />
          <span className='text-lg font-normal text-muted-foreground'>
            Reviews Collector
          </span>
        </h1>
      </div>

      <nav className='flex flex-col gap-2'>
        <Button
          variant='ghost'
          onClick={() => onViewChange('collection')}
          className={`
            w-full justify-start h-auto px-4 py-3 text-sm font-medium transition-all duration-300
            ${
              currentView === 'collection'
                ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 hover:bg-primary/15 hover:text-primary'
                : 'text-muted-foreground hover:bg-white/40 hover:text-foreground hover:translate-x-1'
            }
          `}
        >
          <Download size={20} className='mr-3' />
          <span>収集開始</span>
        </Button>

        <Button
          variant='ghost'
          onClick={() => onViewChange('dashboard')}
          className={`
            w-full justify-start h-auto px-4 py-3 text-sm font-medium transition-all duration-300
            ${
              currentView === 'dashboard'
                ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 hover:bg-primary/15 hover:text-primary'
                : 'text-muted-foreground hover:bg-white/40 hover:text-foreground hover:translate-x-1'
            }
          `}
        >
          <LayoutDashboard size={20} className='mr-3' />
          <span>ダッシュボード</span>
        </Button>
      </nav>

      <div className='mt-auto'>
        <div className='p-4 rounded-xl bg-white/30 border border-white/20 text-xs text-muted-foreground backdrop-blur-sm'>
          <p className='font-semibold mb-1'>Heavenly Collector</p>
          <p>v{packageJson.version}</p>
        </div>
      </div>
    </aside>
  );
}
