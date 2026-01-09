import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Play, 
  Lock,
  Video,
  FileText,
  CheckCircle2
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

export default function LessonPlayer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch course
  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Fetch modules with lessons
  const { data: modules = [] } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: async () => {
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
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
    enabled: !!courseId,
  });

  // Fetch user's lesson progress
  const { data: progressData = [] } = useQuery({
    queryKey: ['lesson-progress', user?.id, courseId],
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

  // Get all lessons in order
  const allLessons = useMemo(() => {
    return modules.flatMap(m => m.lessons);
  }, [modules]);

  // Current lesson
  const currentLesson = useMemo(() => {
    return allLessons.find(l => l.id === lessonId);
  }, [allLessons, lessonId]);

  // Current lesson index
  const currentIndex = useMemo(() => {
    return allLessons.findIndex(l => l.id === lessonId);
  }, [allLessons, lessonId]);

  // Navigation
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Progress tracking
  const completedLessons = progressData.filter(p => p.completed).map(p => p.lesson_id);
  const isCurrentCompleted = lessonId ? completedLessons.includes(lessonId) : false;

  const progressPercent = allLessons.length > 0 
    ? Math.round((completedLessons.filter(id => allLessons.some(l => l.id === id)).length / allLessons.length) * 100)
    : 0;

  // Mark lesson as complete
  const completeMutation = useMutation({
    mutationFn: async (lessonIdToComplete: string) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if progress exists
      const { data: existing } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonIdToComplete)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('lesson_progress')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_progress')
          .insert({ 
            user_id: user.id, 
            lesson_id: lessonIdToComplete, 
            completed: true, 
            completed_at: new Date().toISOString() 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
      toast.success('Aula concluída!');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Helper to extract YouTube embed URL
  const getEmbedUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Already an embed or direct video
    return url;
  };

  const embedUrl = getEmbedUrl(currentLesson?.video_url ?? null);

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Aula não encontrada</p>
          <Button asChild>
            <Link to="/student">Voltar ao Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <DashboardHeader 
          title={currentLesson.title}
          subtitle={course?.title}
          actions={
            <Button variant="outline" asChild>
              <Link to={`/course/${courseId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Curso
              </Link>
            </Button>
          }
        />

        <main className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Video/Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Video Player */}
              {embedUrl ? (
                <Card className="overflow-hidden">
                  <div className="aspect-video bg-black">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Esta aula não possui vídeo</p>
                  </CardContent>
                </Card>
              )}

              {/* Lesson Content */}
              {currentLesson.content && (
                <Card>
                  <CardContent className="p-6 prose prose-sm max-w-none">
                    <h3 className="text-lg font-semibold mb-4">Conteúdo da Aula</h3>
                    <div className="whitespace-pre-wrap">{currentLesson.content}</div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && navigate(`/student/course/${courseId}/lesson/${prevLesson.id}`)}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Aula Anterior
                </Button>

                <Button
                  variant={isCurrentCompleted ? "outline" : "default"}
                  onClick={() => {
                    if (!isCurrentCompleted && lessonId) {
                      completeMutation.mutate(lessonId);
                    }
                  }}
                  disabled={isCurrentCompleted || completeMutation.isPending}
                >
                  {isCurrentCompleted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Concluída
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Marcar como Concluída
                    </>
                  )}
                </Button>

                <Button
                  disabled={!nextLesson}
                  onClick={() => nextLesson && navigate(`/student/course/${courseId}/lesson/${nextLesson.id}`)}
                >
                  Próxima Aula
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Sidebar - Course Contents */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-4">
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progresso do Curso</span>
                      <span className="font-medium">{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  <ScrollArea className="h-[500px] pr-2">
                    <Accordion type="multiple" defaultValue={modules.map(m => m.id)}>
                      {modules.map((module, moduleIndex) => (
                        <AccordionItem key={module.id} value={module.id}>
                          <AccordionTrigger className="text-sm hover:no-underline">
                            <span className="text-left">
                              Módulo {moduleIndex + 1}: {module.title}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-1">
                              {module.lessons.map((lesson, lessonIndex) => {
                                const isActive = lesson.id === lessonId;
                                const isCompleted = completedLessons.includes(lesson.id);

                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => navigate(`/student/course/${courseId}/lesson/${lesson.id}`)}
                                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${
                                      isActive 
                                        ? 'bg-primary/10 text-primary' 
                                        : 'hover:bg-muted'
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      isCompleted 
                                        ? 'bg-success text-white' 
                                        : isActive 
                                          ? 'bg-primary text-white' 
                                          : 'bg-muted-foreground/20'
                                    }`}>
                                      {isCompleted ? (
                                        <Check className="h-3 w-3" />
                                      ) : (
                                        <span className="text-xs">{lessonIndex + 1}</span>
                                      )}
                                    </div>
                                    <span className="flex-1 truncate">{lesson.title}</span>
                                    {lesson.duration && (
                                      <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
