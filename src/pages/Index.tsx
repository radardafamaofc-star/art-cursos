import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CourseCard } from "@/components/courses/CourseCard";
import { 
  GraduationCap, 
  Play, 
  Users, 
  Award, 
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";

const featuredCourses = [
  {
    id: "1",
    title: "Desenvolvimento Web Completo",
    description: "Aprenda HTML, CSS, JavaScript e React do zero ao avançado",
    thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&auto=format&fit=crop&q=60",
    instructor: "João Silva",
    duration: "40h",
    students: 2340,
    modules: 12,
    category: "Programação",
  },
  {
    id: "2",
    title: "Marketing Digital Estratégico",
    description: "Domine as técnicas de marketing digital para impulsionar negócios",
    thumbnail: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800&auto=format&fit=crop&q=60",
    instructor: "Maria Santos",
    duration: "25h",
    students: 1850,
    modules: 8,
    category: "Marketing",
  },
  {
    id: "3",
    title: "Design UX/UI Profissional",
    description: "Crie interfaces incríveis e experiências memoráveis para usuários",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop&q=60",
    instructor: "Ana Costa",
    duration: "35h",
    students: 1560,
    modules: 10,
    category: "Design",
  },
];

const stats = [
  { icon: Users, value: "15.000+", label: "Alunos ativos" },
  { icon: BookOpen, value: "200+", label: "Cursos disponíveis" },
  { icon: Award, value: "98%", label: "Taxa de satisfação" },
  { icon: GraduationCap, value: "5.000+", label: "Certificados emitidos" },
];

const benefits = [
  "Acesso vitalício aos cursos",
  "Certificado de conclusão",
  "Suporte especializado",
  "Comunidade exclusiva",
  "Atualizações gratuitas",
  "Garantia de 7 dias",
];

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-hero py-20 md:py-32">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.08%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
          
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 text-primary-foreground text-sm animate-fade-in">
                <Sparkles className="h-4 w-4" />
                <span>Nova plataforma de ensino online</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-extrabold text-primary-foreground leading-tight animate-fade-in delay-100">
                Transforme seu futuro com{" "}
                <span className="relative">
                  educação de qualidade
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                    <path d="M2 10C50 4 100 4 150 6C200 8 250 8 298 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary-foreground/40"/>
                  </svg>
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto animate-fade-in delay-200">
                Aprenda com os melhores profissionais do mercado. Cursos práticos e atualizados para impulsionar sua carreira.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-fade-in delay-300">
                <Button size="xl" variant="hero-outline" asChild>
                  <Link to="/courses">
                    <Play className="h-5 w-5" />
                    Explorar Cursos
                  </Link>
                </Button>
                <Button size="xl" variant="hero" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild>
                  <Link to="/register">
                    Começar Gratuitamente
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-foreground/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
        </section>

        {/* Stats Section */}
        <section className="py-16 border-b bg-card">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div 
                  key={stat.label} 
                  className="text-center animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Courses Section */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Cursos em Destaque
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Descubra nossos cursos mais populares e comece sua jornada de aprendizado hoje mesmo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCourses.map((course, index) => (
                <div 
                  key={course.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CourseCard {...course} />
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Button size="lg" variant="outline" asChild>
                <Link to="/courses">
                  Ver todos os cursos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-muted/50">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Por que escolher a{" "}
                  <span className="text-gradient">EduPlatform</span>?
                </h2>
                <p className="text-muted-foreground mb-8">
                  Oferecemos uma experiência de aprendizado completa, com recursos exclusivos para garantir seu sucesso profissional.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {benefits.map((benefit, index) => (
                    <div 
                      key={benefit}
                      className="flex items-center gap-3 animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </div>
                      <span className="text-sm font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>

                <Button size="lg" className="mt-8" asChild>
                  <Link to="/register">
                    Criar conta gratuita
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="relative">
                <Card variant="elevated" className="p-8">
                  <div className="aspect-video rounded-lg bg-gradient-primary flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm cursor-pointer hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-primary-foreground ml-1" />
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Veja como nossa plataforma funciona
                  </p>
                </Card>

                {/* Floating cards */}
                <Card className="absolute -top-4 -right-4 p-4 animate-float shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Award className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Certificado</p>
                      <p className="text-xs text-muted-foreground">Reconhecido</p>
                    </div>
                  </div>
                </Card>

                <Card className="absolute -bottom-4 -left-4 p-4 animate-float shadow-lg" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">+15k</p>
                      <p className="text-xs text-muted-foreground">Alunos</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container">
            <Card className="bg-gradient-primary p-12 text-center overflow-hidden relative">
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                  Pronto para começar sua jornada?
                </h2>
                <p className="text-primary-foreground/80 mb-8">
                  Junte-se a milhares de alunos que já estão transformando suas carreiras com nossos cursos.
                </p>
                <Button size="xl" variant="hero" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild>
                  <Link to="/register">
                    Começar Agora
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
              
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
