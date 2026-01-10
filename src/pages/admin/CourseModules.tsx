import { useState, useRef } from "react";
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
import { ArrowLeft, Plus, GripVertical, Pencil, Trash2, Video, FileText, Award, Upload, X, File, Image, FileVideo, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";

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

interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

const ACCEPTED_FILE_TYPES = {
  'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.avi'],
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/vnd.android.package-archive': ['.apk'],
};

const getFileIcon = (type: string) => {
  if (type.startsWith('video/')) return <FileVideo className="h-4 w-4 text-blue-500" />;
  if (type.startsWith('image/')) return <Image className="h-4 w-4 text-green-500" />;
  if (type === 'application/pdf') return <File className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function CourseModules() {
  const { id: courseId } = useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  
  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    setUploadedFiles([]);
    setUploadProgress(0);
  };

  // Parse existing files from content when editing
  const parseExistingFiles = (content: string | null): UploadedFile[] => {
    if (!content) return [];
    const files: UploadedFile[] = [];
    // Parse markdown-style file links: [filename](url)
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const url = match[2];
      if (url.includes('course-content')) {
        files.push({
          name: match[1],
          url: url,
          type: getTypeFromUrl(url),
          size: 0,
        });
      }
    }
    return files;
  };

  const getTypeFromUrl = (url: string): string => {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video/' + ext;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image/' + ext;
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'txt') return 'text/plain';
    if (ext === 'apk') return 'application/vnd.android.package-archive';
    return 'application/octet-stream';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const newUploadedFiles: UploadedFile[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${courseId}/${selectedModuleId}/${Date.now()}-${file.name}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('course-content')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course-content')
          .getPublicUrl(fileName);

        newUploadedFiles.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
        });

        // If it's a video, set as video URL
        if (file.type.startsWith('video/')) {
          setLessonVideoUrl(publicUrl);
        }

        setUploadProgress(((i + 1) / totalFiles) * 100);
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error(`Erro ao fazer upload de ${file.name}: ${error.message}`);
      }
    }

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    setIsUploading(false);
    
    if (newUploadedFiles.length > 0) {
      toast.success(`${newUploadedFiles.length} arquivo(s) enviado(s) com sucesso!`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeUploadedFile = async (fileToRemove: UploadedFile) => {
    // Extract path from URL
    const urlParts = fileToRemove.url.split('/course-content/');
    if (urlParts.length > 1) {
      const filePath = decodeURIComponent(urlParts[1]);
      await supabase.storage.from('course-content').remove([filePath]);
    }
    
    setUploadedFiles(prev => prev.filter(f => f.url !== fileToRemove.url));
    
    // If it was the video URL, clear it
    if (lessonVideoUrl === fileToRemove.url) {
      setLessonVideoUrl('');
    }
    
    toast.success('Arquivo removido');
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
    setUploadedFiles(parseExistingFiles(lesson.content));
    setLessonDialogOpen(true);
  };

  const handleModuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    moduleMutation.mutate({ title: moduleTitle, id: editingModule?.id });
  };

  const handleLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) return;
    
    // Build content with uploaded files
    let finalContent = lessonContent;
    if (uploadedFiles.length > 0) {
      const filesSection = uploadedFiles
        .filter(f => !f.type.startsWith('video/')) // Videos are handled separately
        .map(f => `[${f.name}](${f.url})`)
        .join('\n');
      if (filesSection) {
        finalContent = finalContent ? `${finalContent}\n\n**Arquivos:**\n${filesSection}` : `**Arquivos:**\n${filesSection}`;
      }
    }
    
    lessonMutation.mutate({
      title: lessonTitle,
      content: finalContent,
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
              <Button variant="secondary" asChild>
                <Link to={`/admin/courses/${courseId}/certificate`}>
                  <Award className="h-4 w-4 mr-2" />
                  Certificado
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
              <form onSubmit={handleLessonSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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
                
                {/* File Upload Section */}
                <div className="space-y-2">
                  <Label>Upload de Arquivos</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Vídeos, imagens, PDFs, arquivos TXT e APK (máx. 500MB)
                  </p>
                  
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-primary/50 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="video/*,image/*,.pdf,.txt,.apk"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      {isUploading ? (
                        <div className="w-full space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-sm">Enviando...</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm font-medium">Clique para fazer upload</span>
                          <span className="text-xs text-muted-foreground">ou arraste e solte arquivos aqui</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <Label className="text-sm">Arquivos enviados:</Label>
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg group"
                        >
                          {getFileIcon(file.type)}
                          <span className="flex-1 text-sm truncate" title={file.name}>
                            {file.name}
                          </span>
                          {file.size > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeUploadedFile(file)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lessonVideoUrl">URL do Vídeo (YouTube, Vimeo, etc)</Label>
                  <Input
                    id="lessonVideoUrl"
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... ou use o upload acima"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole um link externo ou faça upload de um vídeo acima
                  </p>
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
                
                <Button type="submit" className="w-full" disabled={lessonMutation.isPending || isUploading}>
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
