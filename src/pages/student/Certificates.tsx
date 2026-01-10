import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { CreatorSubscriptionBanner } from "@/components/creator/CreatorSubscriptionBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Download, Calendar, BookOpen } from "lucide-react";

interface CertificateWithCourse {
  id: string;
  course_id: string;
  issued_at: string;
  certificate_number: string;
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    category: string;
  };
  certificate_template: {
    certificate_url: string;
  } | null;
}

export default function Certificates() {
  const { user, profile } = useAuth();

  // Fetch student's earned certificates with course and template info
  const { data: certificates, isLoading } = useQuery({
    queryKey: ['student-certificates', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get student certificates
      const { data: studentCerts, error: certsError } = await supabase
        .from('student_certificates')
        .select(`
          id,
          course_id,
          issued_at,
          certificate_number
        `)
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (certsError) throw certsError;
      if (!studentCerts || studentCerts.length === 0) return [];

      // Get course details for each certificate
      const courseIds = studentCerts.map(c => c.course_id);
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, thumbnail_url, category')
        .in('id', courseIds);

      if (coursesError) throw coursesError;

      // Get certificate templates
      const { data: templates, error: templatesError } = await supabase
        .from('course_certificates')
        .select('course_id, certificate_url')
        .in('course_id', courseIds);

      if (templatesError) throw templatesError;

      // Combine data
      return studentCerts.map(cert => ({
        ...cert,
        course: courses?.find(c => c.id === cert.course_id) || {
          id: cert.course_id,
          title: 'Curso não encontrado',
          thumbnail_url: null,
          category: 'Geral'
        },
        certificate_template: templates?.find(t => t.course_id === cert.course_id) || null
      })) as CertificateWithCourse[];
    },
    enabled: !!user,
  });

  // Fetch completed courses that don't have certificates yet
  const { data: completedCourses } = useQuery({
    queryKey: ['completed-courses-without-cert', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      if (enrollError) throw enrollError;
      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map(e => e.course_id);

      // Get lesson progress for these courses
      const { data: progress, error: progressError } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id)
        .eq('completed', true);

      if (progressError) throw progressError;

      // Get courses with their lessons
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          modules:modules(
            lessons:lessons(id)
          )
        `)
        .in('id', courseIds);

      if (coursesError) throw coursesError;

      // Get existing student certificates
      const { data: existingCerts } = await supabase
        .from('student_certificates')
        .select('course_id')
        .eq('user_id', user.id);

      const existingCertCourseIds = existingCerts?.map(c => c.course_id) || [];

      // Find completed courses without certificates
      const completedLessonIds = new Set(progress?.map(p => p.lesson_id) || []);
      
      return courses?.filter(course => {
        // Skip if already has certificate
        if (existingCertCourseIds.includes(course.id)) return false;
        
        // Check if all lessons are completed
        const allLessons = course.modules?.flatMap(m => m.lessons || []) || [];
        if (allLessons.length === 0) return false;
        
        return allLessons.every(lesson => completedLessonIds.has(lesson.id));
      }) || [];
    },
    enabled: !!user,
  });

  const handleDownloadCertificate = (cert: CertificateWithCourse) => {
    if (cert.certificate_template?.certificate_url) {
      const link = document.createElement('a');
      link.href = cert.certificate_template.certificate_url;
      link.download = `Certificado_${cert.course.title.replace(/\s+/g, '_')}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClaimCertificate = async (courseId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('student_certificates')
        .insert({
          user_id: user.id,
          course_id: courseId,
        });

      if (error) throw error;

      // Refresh the page to show the new certificate
      window.location.reload();
    } catch (error: any) {
      console.error('Error claiming certificate:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <CreatorSubscriptionBanner />
        <DashboardHeader
          title="Meus Certificados"
          subtitle={`Olá, ${profile?.full_name || 'Aluno'}! Aqui estão seus certificados conquistados.`}
        />

        <main className="p-6 space-y-6">
          {/* Pending Certificates - courses completed but not claimed */}
          {completedCourses && completedCourses.length > 0 && (
            <Card className="animate-fade-in border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Certificados Disponíveis
                </CardTitle>
                <CardDescription>
                  Você completou estes cursos! Clique para resgatar seu certificado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedCourses.map((course) => (
                    <Card key={course.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">{course.title}</h4>
                        <Button 
                          className="w-full"
                          onClick={() => handleClaimCertificate(course.id)}
                        >
                          <Award className="h-4 w-4 mr-2" />
                          Resgatar Certificado
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Earned Certificates */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certificados Conquistados
              </CardTitle>
              <CardDescription>
                Certificados dos cursos que você completou
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : certificates && certificates.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {certificates.map((cert) => (
                    <Card key={cert.id} className="overflow-hidden">
                      {cert.certificate_template?.certificate_url ? (
                        <div className="relative">
                          <img
                            src={cert.certificate_template.certificate_url}
                            alt={`Certificado - ${cert.course.title}`}
                            className="w-full h-48 object-cover"
                          />
                          <Badge className="absolute top-2 right-2">
                            {cert.course.category}
                          </Badge>
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Award className="h-16 w-16 text-primary/50" />
                        </div>
                      )}
                      
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{cert.course.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Emitido em {new Date(cert.issued_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground font-mono">
                          Nº: {cert.certificate_number.slice(0, 8).toUpperCase()}
                        </div>

                        {cert.certificate_template?.certificate_url ? (
                          <Button 
                            className="w-full"
                            onClick={() => handleDownloadCertificate(cert)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar Certificado
                          </Button>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-2 bg-muted rounded">
                            Certificado em processamento
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">Nenhum certificado ainda</h3>
                  <p className="text-sm mb-4">
                    Complete cursos para ganhar certificados!
                  </p>
                  <Button variant="outline" asChild>
                    <a href="/courses">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Explorar Cursos
                    </a>
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