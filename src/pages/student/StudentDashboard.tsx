import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { CreatorSubscriptionBanner } from "@/components/creator/CreatorSubscriptionBanner";
import { CreatorBadge } from "@/components/creator/CreatorBadge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  BookOpen, 
  Trophy, 
  Clock,
  Play,
  Award
} from "lucide-react";

export default function StudentDashboard() {
  const { user, profile, refetchProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Handle subscription success
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    if (subscriptionStatus === 'success') {
      toast.success("Parabéns! Você agora é um Criador de Conteúdo!");
      // Refresh profile and subscription data
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ['creator-subscription'] });
      // Remove the query param
      setSearchParams({});
    } else if (subscriptionStatus === 'renewed') {
      toast.success("Assinatura renovada com sucesso! +30 dias adicionados.");
      // Refresh profile and subscription data
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ['creator-subscription'] });
      // Remove the query param
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refetchProfile, queryClient]);

  const { data: enrollments } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (*)
        `)
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: progress } = useQuery({
    queryKey: ['my-progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const myCourses = enrollments?.map(e => e.courses).filter(Boolean) || [];
  const completedLessons = progress?.length || 0;

  const stats = [
    { title: "Cursos em Andamento", value: myCourses.length.toString(), icon: BookOpen, color: "bg-primary/10 text-primary" },
    { title: "Aulas Concluídas", value: completedLessons.toString(), icon: Trophy, color: "bg-success/10 text-success" },
    { title: "Horas de Estudo", value: "0h", icon: Clock, color: "bg-warning/10 text-warning" },
    { title: "Certificados", value: "0", icon: Award, color: "bg-accent text-accent-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <CreatorSubscriptionBanner />
        
        <DashboardHeader 
          title="Minha Área"
          subtitle={`Olá, ${profile?.full_name || 'Aluno'}! Continue sua jornada de aprendizado.`}
          actions={
            <div className="flex items-center gap-3">
              <CreatorBadge />
              <Button asChild>
                <Link to="/courses">Explorar Cursos</Link>
              </Button>
            </div>
          }
        />

        <main className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={stat.title} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Continue Learning */}
          <Card className="animate-fade-in delay-200">
            <CardHeader>
              <CardTitle>Continue Aprendendo</CardTitle>
              <CardDescription>Seus cursos matriculados</CardDescription>
            </CardHeader>
            <CardContent>
              {myCourses.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myCourses.map((course: any) => (
                    <Card key={course.id} variant="interactive" className="overflow-hidden">
                      <div className="relative">
                        {course.thumbnail_url ? (
                          <img 
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-32 object-cover"
                          />
                        ) : (
                          <div className="w-full h-32 bg-muted flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className="absolute top-2 left-2" variant="secondary">
                          {course.category}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-1">{course.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{course.duration}</p>

                        <div className="mt-3 p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Play className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Continuar de onde parou</p>
                          </div>
                        </div>

                        <Button className="w-full mt-4" asChild>
                          <Link to={`/course/${course.id}`}>
                            Continuar
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum curso matriculado</h3>
                  <p className="mb-4">Explore nosso catálogo e comece a aprender</p>
                  <Button asChild>
                    <Link to="/courses">Explorar Cursos</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
