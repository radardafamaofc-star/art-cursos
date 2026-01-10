import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CheckoutModal } from "@/components/checkout/CheckoutModal";
import { 
  Play, 
  Clock, 
  Users, 
  BookOpen, 
  Award,
  CheckCircle2,
  PlayCircle,
  Lock,
  ArrowLeft
} from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  duration: string | null;
  sort_order: number;
  module_id: string;
}

interface Module {
  id: string;
  title: string;
  sort_order: number;
  lessons: Lesson[];
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showCheckout, setShowCheckout] = useState(false);

  // Fetch course
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch modules with lessons
  const { data: modules = [] } = useQuery({
    queryKey: ['course-modules', id],
    queryFn: async () => {
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', id)
        .order('sort_order');
      if (modulesError) throw modulesError;

      const modulesWithLessons = await Promise.all(
        modulesData.map(async (mod) => {
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('*')
            .eq('module_id', mod.id)
            .order('sort_order');
          return { ...mod, lessons: lessonsData || [] };
        })
      );

      return modulesWithLessons as Module[];
    },
    enabled: !!id,
  });

  // Check if user is enrolled
  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', user?.id, id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch user's lesson progress
  const { data: progressData = [] } = useQuery({
    queryKey: ['lesson-progress', user?.id, id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch enrollment count
  const { data: enrollmentCount = 0 } = useQuery({
    queryKey: ['enrollment-count', id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Você precisa estar logado');
      const { error } = await supabase
        .from('enrollments')
        .insert({ user_id: user.id, course_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      toast.success('Matrícula realizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const isEnrolled = !!enrollment;
  const isAdmin = profile?.role === 'admin';
  
  const allLessons = modules.flatMap(m => m.lessons);
  const completedLessons = progressData.filter(p => p.completed).map(p => p.lesson_id);
  const completedCount = completedLessons.filter(id => allLessons.some(l => l.id === id)).length;
  const progressPercentage = allLessons.length > 0 
    ? Math.round((completedCount / allLessons.length) * 100)
    : 0;

  const firstLesson = allLessons[0];

  const handleEnroll = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // If course is paid, show checkout modal
    if (course?.price && course.price > 0) {
      setShowCheckout(true);
    } else {
      // Free course - enroll directly
      enrollMutation.mutate();
    }
  };

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['enrollment'] });
    queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
    toast.success('Pagamento aprovado! Você já pode acessar o curso.');
  };

  const handleStartCourse = () => {
    if (firstLesson) {
      navigate(`/student/course/${id}/lesson/${firstLesson.id}`);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (isEnrolled || isAdmin) {
      navigate(`/student/course/${id}/lesson/${lesson.id}`);
    } else if (!user) {
      navigate('/login');
    } else {
      toast.info('Matricule-se para acessar as aulas');
    }
  };

  if (courseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Curso não encontrado</h1>
            <Button asChild>
              <Link to="/courses">Ver todos os cursos</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-primary py-12">
          <div className="container">
            <Link 
              to="/courses" 
              className="inline-flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para cursos
            </Link>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 text-primary-foreground">
                <Badge variant="secondary" className="mb-4">
                  {course.category}
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {course.title}
                </h1>
                <p className="text-primary-foreground/80 text-lg mb-6">
                  {course.description}
                </p>

                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{course.duration || '0h'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{allLessons.length} aulas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{enrollmentCount} alunos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>{modules.length} módulos</span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="mt-6">
                  {course.price && course.price > 0 ? (
                    <span className="text-3xl font-bold">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(course.price)}
                    </span>
                  ) : (
                    <span className="text-3xl font-bold text-green-400">Gratuito</span>
                  )}
                </div>
              </div>

              {/* CTA Card */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24 animate-scale-in">
                  <div className="aspect-video relative overflow-hidden rounded-t-xl">
                    {course.thumbnail_url ? (
                      <img 
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    {firstLesson && (isEnrolled || isAdmin) && (
                      <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center">
                        <button 
                          onClick={handleStartCourse}
                          className="w-16 h-16 rounded-full bg-primary-foreground/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                        >
                          <Play className="h-8 w-8 text-primary ml-1" />
                        </button>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6 space-y-4">
                    {isEnrolled ? (
                      <>
                        <Button size="lg" className="w-full" onClick={handleStartCourse} disabled={!firstLesson}>
                          {completedCount > 0 ? 'Continuar Curso' : 'Começar Agora'}
                        </Button>
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Seu progresso</span>
                            <span className="font-medium">{progressPercentage}%</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>
                      </>
                    ) : isAdmin ? (
                      <>
                        <Button size="lg" className="w-full" onClick={handleStartCourse} disabled={!firstLesson}>
                          Visualizar Curso
                        </Button>
                        <Button size="lg" variant="outline" className="w-full" asChild>
                          <Link to={`/admin/courses/${id}/modules`}>
                            Gerenciar Conteúdo
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        {course.price && course.price > 0 ? (
                          <div className="space-y-4">
                            <div className="text-center">
                              <span className="text-3xl font-bold">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(course.price)}
                              </span>
                            </div>
                            <Button 
                              size="lg" 
                              className="w-full" 
                              onClick={handleEnroll}
                              disabled={enrollMutation.isPending}
                            >
                              {enrollMutation.isPending ? 'Processando...' : 'Comprar Curso'}
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="lg" 
                            className="w-full" 
                            onClick={handleEnroll}
                            disabled={enrollMutation.isPending}
                          >
                            {enrollMutation.isPending ? 'Matriculando...' : 'Matricular-se Grátis'}
                          </Button>
                        )}
                      </>
                    )}
                    
                    <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
                      <p>✓ Acesso vitalício</p>
                      <p>✓ Certificado de conclusão</p>
                      <p>✓ {allLessons.length} aulas em {modules.length} módulos</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Course Content */}
        <section className="py-12">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Curriculum */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Conteúdo do Curso</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {modules.length} módulos • {allLessons.length} aulas
                      </span>
                    </div>
                    
                    {isEnrolled && (
                      <div className="pt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Seu progresso</span>
                          <span className="font-medium">{progressPercentage}%</span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {modules.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Este curso ainda não possui conteúdo</p>
                      </div>
                    ) : (
                      <Accordion type="multiple" className="space-y-2" defaultValue={modules.map(m => m.id)}>
                        {modules.map((module, moduleIndex) => (
                          <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3 text-left">
                                <span className="font-semibold">Módulo {moduleIndex + 1}: {module.title}</span>
                                <Badge variant="muted" className="text-xs">
                                  {module.lessons.length} aulas
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pb-2">
                                {module.lessons.map((lesson, lessonIndex) => {
                                  const isCompleted = completedLessons.includes(lesson.id);
                                  const canAccess = isEnrolled || isAdmin;

                                  return (
                                    <div 
                                      key={lesson.id}
                                      onClick={() => handleLessonClick(lesson)}
                                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                        canAccess 
                                          ? 'hover:bg-muted/50 cursor-pointer' 
                                          : 'opacity-60'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        {isCompleted ? (
                                          <CheckCircle2 className="h-5 w-5 text-success" />
                                        ) : canAccess ? (
                                          <PlayCircle className="h-5 w-5 text-primary" />
                                        ) : (
                                          <Lock className="h-5 w-5 text-muted-foreground" />
                                        )}
                                        <span className={isCompleted ? "text-muted-foreground" : ""}>
                                          {lessonIndex + 1}. {lesson.title}
                                        </span>
                                      </div>
                                      <span className="text-sm text-muted-foreground">
                                        {lesson.duration || '--:--'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar spacer for sticky CTA */}
              <div className="hidden lg:block" />
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Checkout Modal */}
      {course && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          courseId={course.id}
          courseTitle={course.title}
          price={course.price || 0}
          sellerId={course.created_by || ""}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
