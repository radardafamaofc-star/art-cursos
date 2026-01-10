import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  Layers,
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

export default function AdminCourses() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-courses', user?.id],
    queryFn: async () => {
      // RLS policies handle filtering:
      // - Admins see all courses
      // - Professors see only their own courses
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Curso excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: () => {
      toast.error('Erro ao excluir curso');
    },
  });

  const handleDelete = (courseId: string) => {
    if (confirm('Tem certeza que deseja excluir este curso?')) {
      deleteMutation.mutate(courseId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <DashboardHeader 
          title={isAdmin ? "Todos os Cursos" : "Meus Cursos"}
          subtitle={isAdmin ? "Gerencie todos os cursos da plataforma" : "Gerencie seus cursos publicados"}
          actions={
            <Button asChild>
              <Link to="/admin/courses/new">
                <Plus className="h-4 w-4 mr-2" />
                Novo Curso
              </Link>
            </Button>
          }
        />

        <main className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{isAdmin ? "Todos os Cursos" : "Meus Cursos"}</CardTitle>
              <CardDescription>
                {courses?.length || 0} curso{courses?.length !== 1 ? 's' : ''} {isAdmin ? 'cadastrado' : 'criado'}{courses?.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : courses && courses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Curso</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Alunos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {course.thumbnail_url ? (
                              <img 
                                src={course.thumbnail_url} 
                                alt={course.title}
                                className="w-12 h-8 rounded object-cover"
                              />
                            ) : (
                              <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">{course.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{course.category}</Badge>
                        </TableCell>
                        <TableCell>{course.duration}</TableCell>
                        <TableCell>{enrollmentCounts?.[course.id] || 0}</TableCell>
                        <TableCell>
                          <Badge variant={course.status === "published" ? "success" : "muted"}>
                            {course.status === "published" ? "Publicado" : "Rascunho"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(course.created_at).toLocaleDateString('pt-BR')}
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
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/courses/${course.id}/modules`}>
                                  <Layers className="h-4 w-4 mr-2" />
                                  Gerenciar Conteúdo
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(course.id)}
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
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum curso cadastrado</h3>
                  <p className="mb-4">Comece criando seu primeiro curso</p>
                  <Button asChild>
                    <Link to="/admin/courses/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Curso
                    </Link>
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
