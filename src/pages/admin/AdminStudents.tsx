import { useState } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, X, Ban, Trash2, Loader2, ArrowLeft, BookOpen, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  blocked: boolean;
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  blocked: boolean;
  blocked_at: string | null;
  courses: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  };
}

export default function AdminStudents() {
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [deleteEnrollment, setDeleteEnrollment] = useState<Enrollment | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StudentProfile[];
    },
  });

  const { data: enrollmentCounts } = useQuery({
    queryKey: ['all-enrollments-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('user_id, course_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(e => {
        counts[e.user_id] = (counts[e.user_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: studentEnrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['student-enrollments', selectedStudent?.user_id],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          user_id,
          course_id,
          enrolled_at,
          blocked,
          blocked_at,
          courses (
            id,
            title,
            thumbnail_url
          )
        `)
        .eq('user_id', selectedStudent.user_id)
        .order('enrolled_at', { ascending: false });
      if (error) throw error;
      return data as Enrollment[];
    },
    enabled: !!selectedStudent,
  });

  const toggleBlockMutation = useMutation({
    mutationFn: async ({ enrollmentId, blocked }: { enrollmentId: string; blocked: boolean }) => {
      const { error } = await supabase
        .from('enrollments')
        .update({ 
          blocked, 
          blocked_at: blocked ? new Date().toISOString() : null 
        })
        .eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
      toast.success(variables.blocked ? 'Acesso bloqueado!' : 'Acesso liberado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar acesso: ' + error.message);
    },
  });

  const removeEnrollmentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['all-enrollments-counts'] });
      toast.success('Matrícula removida com sucesso!');
      setDeleteEnrollment(null);
    },
    onError: (error) => {
      toast.error('Erro ao remover matrícula: ' + error.message);
    },
  });

  // If a student is selected, show their enrollments
  if (selectedStudent) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardSidebar />

        <div className="lg:pl-64">
          <DashboardHeader 
            title={`Matrículas de ${selectedStudent.full_name || 'Aluno'}`}
            subtitle="Gerencie os cursos matriculados deste aluno"
          />

          <main className="p-6">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedStudent(null)}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para lista de alunos
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-medium">
                    {selectedStudent.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <CardTitle>{selectedStudent.full_name || 'Sem nome'}</CardTitle>
                    <CardDescription className="text-xs">{selectedStudent.user_id}</CardDescription>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cadastrado em: {new Date(selectedStudent.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Cursos Matriculados ({studentEnrollments?.length || 0})
                </h3>

                {loadingEnrollments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : studentEnrollments && studentEnrollments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Curso</TableHead>
                        <TableHead>Data da Matrícula</TableHead>
                        <TableHead>Status de Acesso</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentEnrollments.map((enrollment) => (
                        <TableRow key={enrollment.id} className={enrollment.blocked ? "opacity-60" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {enrollment.courses?.thumbnail_url ? (
                                <img 
                                  src={enrollment.courses.thumbnail_url} 
                                  alt={enrollment.courses.title}
                                  className="w-12 h-12 rounded object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{enrollment.courses?.title || 'Curso não encontrado'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(enrollment.enrolled_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {enrollment.blocked ? (
                              <div>
                                <Badge variant="destructive" className="gap-1">
                                  <Ban className="h-3 w-3" /> Bloqueado
                                </Badge>
                                {enrollment.blocked_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Desde: {new Date(enrollment.blocked_at).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="success">Ativo</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant={enrollment.blocked ? "outline" : "secondary"}
                                size="sm"
                                onClick={() => toggleBlockMutation.mutate({ 
                                  enrollmentId: enrollment.id, 
                                  blocked: !enrollment.blocked 
                                })}
                                disabled={toggleBlockMutation.isPending}
                                className="gap-1"
                              >
                                {toggleBlockMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : enrollment.blocked ? (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    Liberar
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    Bloquear
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteEnrollment(enrollment)}
                                className="gap-1"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remover
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma matrícula encontrada</h3>
                    <p>Este aluno não está matriculado em nenhum curso</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>

        {/* Delete Enrollment Confirmation */}
        <AlertDialog open={!!deleteEnrollment} onOpenChange={() => setDeleteEnrollment(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover matrícula?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a matrícula de <strong>{selectedStudent.full_name}</strong> do curso{" "}
                <strong>{deleteEnrollment?.courses?.title}</strong>?
                <br /><br />
                Esta ação não pode ser desfeita e o aluno perderá acesso ao conteúdo do curso.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteEnrollment && removeEnrollmentMutation.mutate(deleteEnrollment.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removeEnrollmentMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removendo...</>
                ) : (
                  'Remover Matrícula'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Main students list
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <DashboardHeader 
          title="Alunos"
          subtitle="Visualize todos os alunos cadastrados"
        />

        <main className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Alunos</CardTitle>
              <CardDescription>
                {students?.length || 0} aluno{students?.length !== 1 ? 's' : ''} cadastrado{students?.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : students && students.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Cursos Matriculados</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow 
                        key={student.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {student.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-medium">{student.full_name || 'Sem nome'}</p>
                              <p className="text-xs text-muted-foreground">{student.user_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{enrollmentCounts?.[student.user_id] || 0}</TableCell>
                        <TableCell>
                          {new Date(student.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.blocked ? "destructive" : "success"}>
                            {student.blocked ? "Bloqueado" : "Ativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum aluno cadastrado</h3>
                  <p>Os alunos aparecerão aqui após se cadastrarem na plataforma</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
