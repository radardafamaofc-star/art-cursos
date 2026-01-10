import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'admin-only' | 'professor' | 'student';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, profileError, loading, refetchProfile, signOut } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If logged in but profile failed to load, show error screen
  if (!profile && profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Erro ao carregar perfil</h2>
            <p className="text-muted-foreground text-sm">
              Não foi possível carregar seus dados. Por favor, tente novamente.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={refetchProfile} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Still loading profile (user exists but no profile yet and no error)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check role requirements
  if (requiredRole) {
    const isAdmin = profile.role === 'admin';
    const isProfessor = profile.role === 'professor';
    const isAdminOrProfessor = isAdmin || isProfessor;
    
    // 'admin-only' means ONLY admins can access (not professors)
    if (requiredRole === 'admin-only' && !isAdmin) {
      if (isProfessor) {
        return <Navigate to="/admin/courses" replace />;
      }
      return <Navigate to="/student" replace />;
    }
    
    // 'admin' routes can be accessed by both admins and professors
    if (requiredRole === 'admin' && !isAdminOrProfessor) {
      return <Navigate to="/student" replace />;
    }
    
    if (requiredRole === 'student' && profile.role !== 'student') {
      if (isAdminOrProfessor) {
        return <Navigate to="/admin" replace />;
      }
    }
  }

  return <>{children}</>;
}
