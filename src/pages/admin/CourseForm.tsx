import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload } from "lucide-react";
import { Link } from "react-router-dom";

const categories = ["Programação", "Marketing", "Design", "Negócios", "Finanças", "Saúde", "Idiomas", "Geral"];

export default function CourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Geral");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description || "");
      setCategory(course.category);
      setDuration(course.duration || "");
      setStatus(course.status as "draft" | "published");
      setThumbnailUrl(course.thumbnail_url || undefined);
    }
  }, [course]);

  const uploadThumbnail = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('course-thumbnails')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('course-thumbnails')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    try {
      let finalThumbnailUrl = thumbnailUrl;

      if (thumbnailFile) {
        finalThumbnailUrl = await uploadThumbnail(thumbnailFile);
      }

      const courseData = {
        title,
        description,
        category,
        duration,
        status,
        thumbnail_url: finalThumbnailUrl,
        created_by: user.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', id);
        
        if (error) throw error;
        toast.success('Curso atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('courses')
          .insert(courseData);
        
        if (error) throw error;
        toast.success('Curso criado com sucesso!');
      }

      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      navigate('/admin/courses');
    } catch (error: any) {
      console.error('Error saving course:', error);
      toast.error(error.message || 'Erro ao salvar curso');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <DashboardHeader 
          title={isEditing ? "Editar Curso" : "Novo Curso"}
          subtitle={isEditing ? "Atualize as informações do curso" : "Preencha os dados do novo curso"}
          actions={
            <Button variant="outline" asChild>
              <Link to="/admin/courses">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
          }
        />

        <main className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Curso</CardTitle>
                    <CardDescription>
                      Dados básicos sobre o curso
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título do curso *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Desenvolvimento Web Completo"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descreva o conteúdo e objetivos do curso..."
                        rows={5}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="duration">Duração</Label>
                        <Input
                          id="duration"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="Ex: 40h"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Thumbnail</CardTitle>
                    <CardDescription>
                      Imagem de capa do curso
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ImageUpload
                      value={thumbnailUrl}
                      onChange={setThumbnailUrl}
                      onFileSelect={setThumbnailFile}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Publicação</CardTitle>
                    <CardDescription>
                      Status de visibilidade
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="published">Publicado</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {status === "draft" 
                          ? "Curso visível apenas para administradores" 
                          : "Curso visível para todos os alunos"}
                      </p>
                    </div>

                    <Button type="submit" className="w-full" disabled={saving}>
                      {saving ? (
                        <>Salvando...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isEditing ? "Atualizar Curso" : "Criar Curso"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
