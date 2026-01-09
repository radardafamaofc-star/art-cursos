import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

// Mock course data
const courseData = {
  id: "1",
  title: "Desenvolvimento Web Completo",
  description: "Aprenda HTML, CSS, JavaScript e React do zero ao avançado. Este curso abrangente irá transformá-lo em um desenvolvedor web profissional, cobrindo todos os fundamentos e técnicas avançadas necessárias para criar aplicações web modernas.",
  thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&auto=format&fit=crop&q=60",
  instructor: {
    name: "João Silva",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=60",
    bio: "Desenvolvedor web com mais de 10 anos de experiência em empresas como Google e Microsoft.",
  },
  duration: "40h",
  students: 2340,
  modules: 12,
  lessons: 85,
  category: "Programação",
  level: "Iniciante ao Avançado",
  rating: 4.8,
  reviews: 456,
  lastUpdate: "Janeiro 2025",
  whatYouWillLearn: [
    "Dominar HTML5, CSS3 e JavaScript moderno",
    "Criar aplicações React do zero",
    "Trabalhar com APIs e bancos de dados",
    "Implementar autenticação e autorização",
    "Deploy de aplicações na nuvem",
    "Boas práticas e padrões de código",
  ],
  curriculum: [
    {
      id: "1",
      title: "Introdução ao Desenvolvimento Web",
      lessons: [
        { id: "1-1", title: "Bem-vindo ao curso", duration: "5:00", completed: true, preview: true },
        { id: "1-2", title: "Configurando o ambiente", duration: "15:00", completed: true, preview: true },
        { id: "1-3", title: "Estrutura de um projeto web", duration: "12:00", completed: false, preview: false },
      ],
    },
    {
      id: "2",
      title: "HTML5 - Fundamentos",
      lessons: [
        { id: "2-1", title: "Tags e elementos HTML", duration: "20:00", completed: false, preview: false },
        { id: "2-2", title: "Semântica HTML5", duration: "18:00", completed: false, preview: false },
        { id: "2-3", title: "Formulários e validação", duration: "25:00", completed: false, preview: false },
      ],
    },
    {
      id: "3",
      title: "CSS3 - Estilização",
      lessons: [
        { id: "3-1", title: "Seletores e propriedades", duration: "22:00", completed: false, preview: false },
        { id: "3-2", title: "Flexbox", duration: "30:00", completed: false, preview: false },
        { id: "3-3", title: "Grid Layout", duration: "28:00", completed: false, preview: false },
        { id: "3-4", title: "Animações CSS", duration: "20:00", completed: false, preview: false },
      ],
    },
    {
      id: "4",
      title: "JavaScript - Do Básico ao Avançado",
      lessons: [
        { id: "4-1", title: "Variáveis e tipos de dados", duration: "15:00", completed: false, preview: false },
        { id: "4-2", title: "Funções e escopo", duration: "25:00", completed: false, preview: false },
        { id: "4-3", title: "DOM Manipulation", duration: "35:00", completed: false, preview: false },
        { id: "4-4", title: "Promises e Async/Await", duration: "30:00", completed: false, preview: false },
      ],
    },
  ],
};

export default function CourseDetail() {
  const { id } = useParams();
  const course = courseData; // In production, fetch based on id

  const completedLessons = course.curriculum.flatMap(m => m.lessons).filter(l => l.completed).length;
  const totalLessons = course.curriculum.flatMap(m => m.lessons).length;
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

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
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.lessons} aulas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{course.students} alunos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>{course.level}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <img 
                    src={course.instructor.avatar} 
                    alt={course.instructor.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{course.instructor.name}</p>
                    <p className="text-sm text-primary-foreground/70">Instrutor</p>
                  </div>
                </div>
              </div>

              {/* CTA Card */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24 animate-scale-in">
                  <div className="aspect-video relative overflow-hidden rounded-t-xl">
                    <img 
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-primary-foreground/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-primary ml-1" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <Button size="lg" className="w-full">
                      Começar Agora
                    </Button>
                    <Button size="lg" variant="outline" className="w-full">
                      Adicionar à Lista
                    </Button>
                    
                    <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
                      <p>✓ Acesso vitalício</p>
                      <p>✓ Certificado de conclusão</p>
                      <p>✓ Suporte do instrutor</p>
                      <p>✓ Garantia de 7 dias</p>
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
                {/* What you'll learn */}
                <Card>
                  <CardHeader>
                    <CardTitle>O que você vai aprender</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {course.whatYouWillLearn.map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Curriculum */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Conteúdo do Curso</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {course.modules} módulos • {course.lessons} aulas
                      </span>
                    </div>
                    
                    {/* Progress (only show if enrolled) */}
                    <div className="pt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Seu progresso</span>
                        <span className="font-medium">{progressPercentage}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="space-y-2">
                      {course.curriculum.map((module) => (
                        <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                              <span className="font-semibold">{module.title}</span>
                              <Badge variant="muted" className="text-xs">
                                {module.lessons.length} aulas
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pb-2">
                              {module.lessons.map((lesson) => (
                                <div 
                                  key={lesson.id}
                                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    {lesson.completed ? (
                                      <CheckCircle2 className="h-5 w-5 text-success" />
                                    ) : lesson.preview ? (
                                      <PlayCircle className="h-5 w-5 text-primary" />
                                    ) : (
                                      <Lock className="h-5 w-5 text-muted-foreground" />
                                    )}
                                    <span className={lesson.completed ? "text-muted-foreground" : ""}>
                                      {lesson.title}
                                    </span>
                                    {lesson.preview && (
                                      <Badge variant="outline" className="text-xs">
                                        Preview
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {lesson.duration}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>

                {/* Instructor */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sobre o Instrutor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <img 
                        src={course.instructor.avatar}
                        alt={course.instructor.name}
                        className="w-16 h-16 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold text-lg">{course.instructor.name}</h3>
                        <p className="text-muted-foreground text-sm mt-1">
                          {course.instructor.bio}
                        </p>
                      </div>
                    </div>
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
    </div>
  );
}
