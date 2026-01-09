import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, GripVertical, Pencil, Trash2, Video, FileText } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Module {
  id: string;
  title: string;
  sort_order: number;
  course_id: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  duration: string | null;
  sort_order: number;
  module_id: string;
}

export default function CourseModules() {
  const { id: courseId } = useParams();
  const queryClient = useQueryClient();

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Form states
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");

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
  const { data: modules = [], isLoading } = useQuery({
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

  // Create/Update Module
  const moduleMutation = useMutation({
    mutationFn: async ({ title, id }: { title: string; id?: string }) => {
      if (id) {
        const { error } = await supabase
          .from('modules')
          .update({ title })
          .eq('id', id);
        if (error) throw error;
      } else {
        const maxOrder = modules.length > 0 ? Math.max(...modules.map(m => m.sort_order)) + 1 : 0;
        const { error } = await supabase
          .from('modules')
          .insert({ title, course_id: courseId, sort_order: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
      toast.success(editingModule ? 'Módulo atualizado!' : 'Módulo criado!');
      resetModuleForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Delete Module
  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
      toast.success('Módulo excluído!');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Create/Update Lesson
  const lessonMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; video_url: string; duration: string; id?: string; module_id: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('lessons')
          .update({ 
            title: data.title, 
            content: data.content || null, 
            video_url: data.video_url || null, 
            duration: data.duration || null 
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const module = modules.find(m => m.id === data.module_id);
        const maxOrder = module?.lessons?.length ? Math.max(...module.lessons.map(l => l.sort_order)) + 1 : 0;
        const { error } = await supabase
          .from('lessons')
          .insert({ 
            title: data.title, 
            content: data.content || null, 
            video_url: data.video_url || null, 
            duration: data.duration || null,
            module_id: data.module_id, 
            sort_order: maxOrder 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
      toast.success(editingLesson ? 'Aula atualizada!' : 'Aula criada!');
      resetLessonForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Delete Lesson
  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
      toast.success('Aula excluída!');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const resetModuleForm = () => {
    setModuleTitle("");
    setEditingModule(null);
    setModuleDialogOpen(false);
  };

  const resetLessonForm = () => {
    setLessonTitle("");
    setLessonContent("");
    setLessonVideoUrl("");
    setLessonDuration("");
    setEditingLesson(null);
    setSelectedModuleId(null);
    setLessonDialogOpen(false);
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleTitle(module.title);
    setModuleDialogOpen(true);
  };

  const openAddLesson = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    resetLessonForm();
    setSelectedModuleId(moduleId);
    setLessonDialogOpen(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setSelectedModuleId(lesson.module_id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || "");
    setLessonVideoUrl(lesson.video_url || "");
    setLessonDuration(lesson.duration || "");
    setLessonDialogOpen(true);
  };

  const handleModuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    moduleMutation.mutate({ title: moduleTitle, id: editingModule?.id });
  };

  const handleLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) return;
    lessonMutation.mutate({
      title: lessonTitle,
      content: lessonContent,
      video_url: lessonVideoUrl,
      duration: lessonDuration,
      id: editingLesson?.id,
      module_id: selectedModuleId,
    });
  };

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <DashboardHeader 
          title="Gerenciar Conteúdo"
          subtitle={course?.title || "Carregando..."}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/admin/courses">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              <Dialog open={moduleDialogOpen} onOpenChange={(open) => { if (!open) resetModuleForm(); setModuleDialogOpen(open); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Módulo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingModule ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
                    <DialogDescription>
                      {editingModule ? 'Atualize o título do módulo' : 'Adicione um novo módulo ao curso'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleModuleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="moduleTitle">Título do Módulo</Label>
                      <Input
                        id="moduleTitle"
                        value={moduleTitle}
                        onChange={(e) => setModuleTitle(e.target.value)}
                        placeholder="Ex: Introdução ao Curso"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={moduleMutation.isPending}>
                      {moduleMutation.isPending ? 'Salvando...' : (editingModule ? 'Atualizar' : 'Criar Módulo')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        <main className="p-6">
          <div className="grid gap-4 mb-6 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Módulos</p>
                <p className="text-2xl font-bold">{modules.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Aulas</p>
                <p className="text-2xl font-bold">{totalLessons}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold capitalize">{course?.status === 'published' ? 'Publicado' : 'Rascunho'}</p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : modules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum módulo ainda</h3>
                <p className="mb-4">Comece adicionando módulos e aulas ao seu curso.</p>
                <Button onClick={() => setModuleDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Módulo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Estrutura do Curso</CardTitle>
                <CardDescription>Organize módulos e aulas do seu curso</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="space-y-2">
                  {modules.map((module, index) => (
                    <AccordionItem 
                      key={module.id} 
                      value={module.id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Módulo {index + 1}: {module.title}</span>
                          <span className="text-sm text-muted-foreground ml-auto mr-4">
                            {module.lessons?.length || 0} aulas
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-2 pb-4 space-y-2">
                          {module.lessons?.map((lesson, lessonIndex) => (
                            <div 
                              key={lesson.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              {lesson.video_url ? (
                                <Video className="h-4 w-4 text-primary" />
                              ) : (
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="flex-1">
                                {lessonIndex + 1}. {lesson.title}
                              </span>
                              {lesson.duration && (
                                <span className="text-sm text-muted-foreground">{lesson.duration}</span>
                              )}
                              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => openEditLesson(lesson)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => {
                                    if (confirm('Excluir esta aula?')) {
                                      deleteLessonMutation.mutate(lesson.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openAddLesson(module.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar Aula
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openEditModule(module)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar Módulo
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Excluir este módulo e todas as aulas?')) {
                                  deleteModuleMutation.mutate(module.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Lesson Dialog */}
          <Dialog open={lessonDialogOpen} onOpenChange={(open) => { if (!open) resetLessonForm(); setLessonDialogOpen(open); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingLesson ? 'Editar Aula' : 'Nova Aula'}</DialogTitle>
                <DialogDescription>
                  {editingLesson ? 'Atualize os dados da aula' : 'Adicione uma nova aula ao módulo'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleLessonSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lessonTitle">Título da Aula *</Label>
                  <Input
                    id="lessonTitle"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="Ex: Bem-vindo ao curso"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lessonVideoUrl">URL do Vídeo (YouTube, Vimeo, etc)</Label>
                  <Input
                    id="lessonVideoUrl"
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lessonDuration">Duração</Label>
                  <Input
                    id="lessonDuration"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    placeholder="Ex: 10:30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lessonContent">Conteúdo / Descrição</Label>
                  <Textarea
                    id="lessonContent"
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                    placeholder="Descrição ou conteúdo em texto da aula..."
                    rows={4}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={lessonMutation.isPending}>
                  {lessonMutation.isPending ? 'Salvando...' : (editingLesson ? 'Atualizar Aula' : 'Criar Aula')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
