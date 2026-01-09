import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  LogOut,
  BookMarked,
  Award,
  Plus,
} from 'lucide-react';

interface SidebarLink {
  to: string;
  icon: React.ElementType;
  label: string;
}

export function DashboardSidebar() {
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();

  const adminLinks: SidebarLink[] = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/courses', icon: BookOpen, label: 'Cursos' },
    { to: '/admin/students', icon: Users, label: 'Alunos' },
    { to: '/admin/settings', icon: Settings, label: 'Configurações' },
  ];

  const studentLinks: SidebarLink[] = [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/courses', icon: BookOpen, label: 'Meus Cursos' },
    { to: '/courses', icon: BookMarked, label: 'Explorar' },
    { to: '/student/certificates', icon: Award, label: 'Certificados' },
    { to: '/student/settings', icon: Settings, label: 'Configurações' },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r hidden lg:flex flex-col">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span>EduPlatform</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            to="/admin/courses/new"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mt-4 border-t pt-6"
          >
            <Plus className="h-5 w-5" />
            Novo Curso
          </Link>
        )}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || 'Usuário'}</p>
            <p className="text-xs text-muted-foreground">{isAdmin ? 'Administrador' : 'Aluno'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
