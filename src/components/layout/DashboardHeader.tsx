import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DashboardSidebar } from './DashboardSidebar';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({ title, subtitle, actions }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-4">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <div className="h-full">
                <DashboardSidebar />
              </div>
            </SheetContent>
          </Sheet>

          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
