import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminStudents() {
  const { data: students, isLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ['all-enrollments'],
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
                      <TableRow key={student.id}>
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
                        <TableCell>{enrollments?.[student.user_id] || 0}</TableCell>
                        <TableCell>
                          {new Date(student.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="success">Ativo</Badge>
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
