import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  GraduationCap,
  BookOpen, 
  Trophy, 
  Clock,
  Play,
  LogOut,
  Settings,
  LayoutDashboard,
  BookMarked,
  Award
} from "lucide-react";

const stats = [
  { title: "Cursos em Andamento", value: "3", icon: BookOpen, color: "bg-primary/10 text-primary" },
  { title: "Cursos Concluídos", value: "5", icon: Trophy, color: "bg-success/10 text-success" },
  { title: "Horas de Estudo", value: "48h", icon: Clock, color: "bg-warning/10 text-warning" },
  { title: "Certificados", value: "5", icon: Award, color: "bg-accent text-accent-foreground" },
];

const myCourses = [
  { 
    id: "1", 
    title: "Desenvolvimento Web Completo", 
    instructor: "João Silva",
    thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&auto=format&fit=crop&q=60",
    progress: 65,
    nextLesson: "CSS Grid Layout",
    category: "Programação"
  },
  { 
    id: "2", 
    title: "Marketing Digital Estratégico", 
    instructor: "Maria Santos",
    thumbnail: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800&auto=format&fit=crop&q=60",
    progress: 40,
    nextLesson: "SEO Avançado",
    category: "Marketing"
  },
  { 
    id: "3", 
    title: "Design UX/UI Profissional", 
    instructor: "Ana Costa",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop&q=60",
    progress: 20,
    nextLesson: "Princípios de Design",
    category: "Design"
  },
];

const completedCourses = [
  { id: "4", title: "Python para Iniciantes", completedAt: "15 Dez 2024", certificate: true },
  { id: "5", title: "Excel Avançado", completedAt: "01 Dez 2024", certificate: true },
  { id: "6", title: "Comunicação Efetiva", completedAt: "20 Nov 2024", certificate: true },
];

export default function StudentDashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r hidden lg:block">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span>EduPlatform</span>
          </Link>
        </div>

        <nav className="px-4 space-y-1">
          <Link 
            to="/student" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
          <Link 
            to="/student/courses" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <BookOpen className="h-5 w-5" />
            Meus Cursos
          </Link>
          <Link 
            to="/courses" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <BookMarked className="h-5 w-5" />
            Explorar
          </Link>
          <Link 
            to="/student/certificates" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Award className="h-5 w-5" />
            Certificados
          </Link>
          <Link 
            to="/student/settings" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" asChild>
            <Link to="/">
              <LogOut className="h-5 w-5 mr-3" />
              Sair
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
          <div className="flex items-center justify-between h-16 px-6">
            <div>
              <h1 className="text-xl font-bold">Minha Área</h1>
              <p className="text-sm text-muted-foreground">Continue sua jornada de aprendizado!</p>
            </div>
            <Button asChild>
              <Link to="/courses">
                Explorar Cursos
              </Link>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={stat.title} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Continue Learning */}
          <Card className="animate-fade-in delay-200">
            <CardHeader>
              <CardTitle>Continue Aprendendo</CardTitle>
              <CardDescription>Retome de onde você parou</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCourses.map((course) => (
                  <Card key={course.id} variant="interactive" className="overflow-hidden">
                    <div className="relative">
                      <img 
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-32 object-cover"
                      />
                      <Badge className="absolute top-2 left-2" variant="secondary">
                        {course.category}
                      </Badge>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                        <div 
                          className="h-full bg-gradient-primary transition-all duration-300"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-1">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">{course.instructor}</p>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-primary">{course.progress}%</span>
                          <span className="text-muted-foreground">concluído</span>
                        </div>
                      </div>

                      <div className="mt-3 p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Play className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Próxima aula</p>
                          <p className="text-sm font-medium truncate">{course.nextLesson}</p>
                        </div>
                      </div>

                      <Button className="w-full mt-4" asChild>
                        <Link to={`/course/${course.id}/learn`}>
                          Continuar
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Completed Courses */}
          <Card className="animate-fade-in delay-300">
            <CardHeader>
              <CardTitle>Cursos Concluídos</CardTitle>
              <CardDescription>Seus certificados de conclusão</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedCourses.map((course) => (
                  <div 
                    key={course.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground">Concluído em {course.completedAt}</p>
                      </div>
                    </div>
                    {course.certificate && (
                      <Button variant="outline" size="sm">
                        <Award className="h-4 w-4 mr-2" />
                        Ver Certificado
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
