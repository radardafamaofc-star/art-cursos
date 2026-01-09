import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap,
  BookOpen, 
  Users, 
  TrendingUp, 
  DollarSign,
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  LogOut,
  Settings,
  LayoutDashboard
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const stats = [
  { title: "Total de Cursos", value: "24", change: "+2", icon: BookOpen, color: "bg-primary/10 text-primary" },
  { title: "Alunos Ativos", value: "1,234", change: "+12%", icon: Users, color: "bg-success/10 text-success" },
  { title: "Taxa de Conclusão", value: "78%", change: "+5%", icon: TrendingUp, color: "bg-warning/10 text-warning" },
  { title: "Receita Mensal", value: "R$ 45.2k", change: "+18%", icon: DollarSign, color: "bg-accent text-accent-foreground" },
];

const courses = [
  { id: "1", title: "Desenvolvimento Web Completo", students: 2340, status: "Publicado", category: "Programação" },
  { id: "2", title: "Marketing Digital Estratégico", students: 1850, status: "Publicado", category: "Marketing" },
  { id: "3", title: "Design UX/UI Profissional", students: 1560, status: "Publicado", category: "Design" },
  { id: "4", title: "Python para Data Science", students: 3200, status: "Publicado", category: "Programação" },
  { id: "5", title: "Gestão de Projetos Ágeis", students: 980, status: "Rascunho", category: "Negócios" },
];

const recentStudents = [
  { id: "1", name: "Ana Maria Silva", email: "ana@email.com", course: "Desenvolvimento Web", date: "Há 2 horas" },
  { id: "2", name: "Carlos Santos", email: "carlos@email.com", course: "Marketing Digital", date: "Há 4 horas" },
  { id: "3", name: "Julia Costa", email: "julia@email.com", course: "Design UX/UI", date: "Há 6 horas" },
  { id: "4", name: "Pedro Alves", email: "pedro@email.com", course: "Python Data Science", date: "Há 8 horas" },
];

export default function AdminDashboard() {
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
            to="/admin" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
          <Link 
            to="/admin/courses" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <BookOpen className="h-5 w-5" />
            Cursos
          </Link>
          <Link 
            to="/admin/students" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Users className="h-5 w-5" />
            Alunos
          </Link>
          <Link 
            to="/admin/settings" 
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
              <h1 className="text-xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Bem-vindo de volta, Admin!</p>
            </div>
            <Button asChild>
              <Link to="/admin/courses/new">
                <Plus className="h-4 w-4 mr-2" />
                Novo Curso
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
                      <p className="text-xs text-success mt-1">{stat.change} este mês</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Courses Table */}
            <Card className="lg:col-span-2 animate-fade-in delay-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cursos</CardTitle>
                  <CardDescription>Gerenciar seus cursos</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/courses">Ver todos</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Curso</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Alunos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{course.category}</Badge>
                        </TableCell>
                        <TableCell>{course.students}</TableCell>
                        <TableCell>
                          <Badge variant={course.status === "Publicado" ? "success" : "muted"}>
                            {course.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent Students */}
            <Card className="animate-fade-in delay-300">
              <CardHeader>
                <CardTitle>Alunos Recentes</CardTitle>
                <CardDescription>Últimas matrículas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentStudents.map((student) => (
                  <div key={student.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.course}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{student.date}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
