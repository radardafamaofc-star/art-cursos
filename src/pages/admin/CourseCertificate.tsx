import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { CreatorSubscriptionBanner } from "@/components/creator/CreatorSubscriptionBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileImage, Trash2, Download, Award } from "lucide-react";

export default function CourseCertificate() {
  const { id: courseId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch course details
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

  // Fetch existing certificate
  const { data: certificate, isLoading } = useQuery({
    queryKey: ['course-certificate', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_certificates')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !courseId || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem (PNG, JPG, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${courseId}/certificate.${fileExt}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName);

      const certificateUrl = `${publicUrl}?t=${Date.now()}`;

      // Insert or update certificate record
      if (certificate) {
        const { error } = await supabase
          .from('course_certificates')
          .update({ certificate_url: certificateUrl })
          .eq('id', certificate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('course_certificates')
          .insert({
            course_id: courseId,
            certificate_url: certificateUrl,
          });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['course-certificate', courseId] });
      toast.success("Certificado salvo com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer upload do certificado");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!certificate || !courseId) return;
    
    if (!confirm('Tem certeza que deseja remover o certificado?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('certificates')
        .remove([`${courseId}/certificate.png`, `${courseId}/certificate.jpg`, `${courseId}/certificate.jpeg`]);

      // Delete from database
      const { error } = await supabase
        .from('course_certificates')
        .delete()
        .eq('id', certificate.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['course-certificate', courseId] });
      toast.success("Certificado removido com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover certificado");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <CreatorSubscriptionBanner />
        <DashboardHeader
          title="Certificado do Curso"
          subtitle={course?.title || "Carregando..."}
          actions={
            <Button variant="outline" asChild>
              <Link to={`/admin/courses/${courseId}/modules`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar aos Módulos
              </Link>
            </Button>
          }
        />

        <main className="p-6 max-w-3xl">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Modelo de Certificado
              </CardTitle>
              <CardDescription>
                Faça upload de uma imagem do certificado que será exibida para os alunos que concluírem o curso.
                Recomendamos usar uma imagem em alta resolução (mínimo 1920x1080 pixels).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="h-64 bg-muted rounded-lg animate-pulse" />
              ) : certificate ? (
                <div className="space-y-4">
                  <div className="relative border rounded-lg overflow-hidden bg-muted">
                    <img
                      src={certificate.certificate_url}
                      alt="Modelo de certificado"
                      className="w-full h-auto"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Enviando..." : "Alterar Certificado"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                    <Button
                      variant="secondary"
                      asChild
                    >
                      <a href={certificate.certificate_url} download target="_blank">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    Nenhum certificado configurado
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clique para fazer upload de uma imagem de certificado
                  </p>
                  <Button disabled={uploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Enviando..." : "Fazer Upload"}
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">💡 Dicas para o certificado:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use imagens PNG ou JPG em alta resolução</li>
                  <li>• Deixe espaço para o nome do aluno ser inserido</li>
                  <li>• Inclua o nome do curso, data e sua assinatura</li>
                  <li>• Tamanho recomendado: 1920x1080 pixels (16:9)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}