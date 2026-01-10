import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { CreatorSubscriptionBanner } from "@/components/creator/CreatorSubscriptionBanner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, 
  Users, 
  TrendingUp, 
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { profile } = useAuth();

  const { data: courses, refetch: refetchCourses } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollmentCounts } = useQuery({
    queryKey: ['enrollment-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('course_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(e => {
        counts[e.course_id] = (counts[e.course_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Tem certeza que deseja excluir este curso?')) return;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      toast.error('Erro ao excluir curso');
    } else {
      toast.success('Curso excluído com sucesso');
      refetchCourses();
    }
  };

  const totalStudents = profiles?.length || 0;
  const totalCourses = courses?.length || 0;
  const publishedCourses = courses?.filter(c => c.status === 'published').length || 0;

  const stats = [
    { title: "Total de Cursos", value: totalCourses.toString(), icon: BookOpen, color: "bg-primary/10 text-primary" },
    { title: "Alunos Ativos", value: totalStudents.toString(), icon: Users, color: "bg-success/10 text-success" },
    { title: "Cursos Publicados", value: publishedCourses.toString(), icon: TrendingUp, color: "bg-warning/10 text-warning" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <CreatorSubscriptionBanner />
        <DashboardHeader
          title="Dashboard"
          subtitle={`Bem-vindo de volta, ${profile?.full_name || 'Admin'}!`}
          actions={
            <Button asChild>
              <Link to="/admin/courses/new">
                <Plus className="h-4 w-4 mr-2" />
                Novo Curso
              </Link>
            </Button>
          }
        />

        <main className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Courses Table */}
            <Card className="lg:col-span-2 animate-fade-in delay-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cursos</CardTitle>
                  <CardDescription>Gerenciar seus cursos</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/courses">Ver todos</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {courses && courses.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Curso</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Alunos</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.slice(0, 5).map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">{course.title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{course.category}</Badge>
                          </TableCell>
                          <TableCell>{enrollmentCounts?.[course.id] || 0}</TableCell>
                          <TableCell>
                            <Badge variant={course.status === "published" ? "success" : "muted"}>
                              {course.status === "published" ? "Publicado" : "Rascunho"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/course/${course.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizar
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/courses/${course.id}/edit`}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteCourse(course.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum curso cadastrado ainda.</p>
                    <Button asChild className="mt-4">
                      <Link to="/admin/courses/new">Criar primeiro curso</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Students */}
            <Card className="animate-fade-in delay-300">
              <CardHeader>
                <CardTitle>Alunos Recentes</CardTitle>
                <CardDescription>Últimos cadastros</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profiles && profiles.length > 0 ? (
                  profiles.map((student) => (
                    <div key={student.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {student.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{student.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(student.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">Nenhum aluno cadastrado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
