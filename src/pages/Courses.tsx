import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CourseCard } from "@/components/courses/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal } from "lucide-react";

const allCourses = [
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
  {
    id: "4",
    title: "Python para Data Science",
    description: "Análise de dados e machine learning com Python",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60",
    instructor: "Carlos Mendes",
    duration: "50h",
    students: 3200,
    modules: 15,
    category: "Programação",
  },
  {
    id: "5",
    title: "Gestão de Projetos Ágeis",
    description: "Scrum, Kanban e metodologias ágeis na prática",
    thumbnail: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&auto=format&fit=crop&q=60",
    instructor: "Paula Lima",
    duration: "20h",
    students: 980,
    modules: 6,
    category: "Negócios",
  },
  {
    id: "6",
    title: "Fotografia Profissional",
    description: "Técnicas de fotografia e edição de imagens",
    thumbnail: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=60",
    instructor: "Ricardo Alves",
    duration: "30h",
    students: 1200,
    modules: 9,
    category: "Design",
  },
];

const categories = ["Todos", "Programação", "Marketing", "Design", "Negócios"];

export default function Courses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const filteredCourses = allCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-primary py-16">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center text-primary-foreground">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Explore nossos cursos
              </h1>
              <p className="text-primary-foreground/80 mb-8">
                Encontre o curso perfeito para impulsionar sua carreira
              </p>

              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar cursos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-background-pure text-foreground border-0 shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filters & Courses */}
        <section className="py-12">
          <div className="container">
            {/* Category Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2 text-sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>

            {/* Results Count */}
            <p className="text-sm text-muted-foreground mb-6">
              {filteredCourses.length} curso{filteredCourses.length !== 1 ? "s" : ""} encontrado{filteredCourses.length !== 1 ? "s" : ""}
            </p>

            {/* Courses Grid */}
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => (
                  <div 
                    key={course.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CourseCard {...course} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">
                  Nenhum curso encontrado para sua busca.
                </p>
                <Button variant="outline" onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Todos");
                }}>
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
