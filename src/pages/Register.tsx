import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Mail, Lock, User, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const benefits = [
  "Acesso a cursos gratuitos",
  "Certificados de conclusão",
  "Comunidade de alunos",
  "Suporte especializado",
];

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Register logic will be implemented with Supabase
    console.log("Register attempt:", { name, email, password });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 text-primary-foreground max-w-md">
          <h2 className="text-3xl font-bold mb-6">
            Comece sua transformação hoje
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            Junte-se a milhares de alunos que já estão aprendendo e crescendo profissionalmente.
          </p>
          
          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <div 
                key={benefit}
                className="flex items-center gap-3 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-foreground/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
        
        {/* Floating elements */}
        <div className="absolute top-1/4 right-1/4 w-20 h-20 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm animate-float" />
        <div className="absolute bottom-1/3 left-1/4 w-16 h-16 rounded-xl bg-primary-foreground/10 backdrop-blur-sm animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o início
            </Link>
            
            <Link to="/" className="flex items-center gap-2 font-bold text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span>EduPlatform</span>
            </Link>
          </div>

          <Card variant="elevated" className="animate-fade-in">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Criar sua conta</CardTitle>
              <CardDescription>
                Preencha os dados abaixo para começar
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Ao criar uma conta, você concorda com nossos{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Termos de Uso
                  </Link>{" "}
                  e{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Política de Privacidade
                  </Link>
                  .
                </p>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" size="lg">
                  Criar conta
                </Button>
                
                <p className="text-sm text-center text-muted-foreground">
                  Já tem uma conta?{" "}
                  <Link to="/login" className="text-primary font-medium hover:underline">
                    Fazer login
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
