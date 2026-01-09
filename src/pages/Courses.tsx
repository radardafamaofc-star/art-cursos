import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CourseCard } from "@/components/courses/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Courses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  // Fetch courses from database
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["published-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, modules(id)")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Get unique categories from courses
  const categories = useMemo(() => {
    const cats = new Set(courses.map((c) => c.category));
    return ["Todos", ...Array.from(cats)];
  }, [courses]);

  // Count enrollments for each course
  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["enrollment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id");

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((e) => {
        counts[e.course_id] = (counts[e.course_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
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
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => (
                  <div 
                    key={course.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CourseCard 
                      id={course.id}
                      title={course.title}
                      description={course.description || ""}
                      thumbnail={course.thumbnail_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                      instructor="Instrutor"
                      duration={course.duration || "0h"}
                      students={enrollmentCounts[course.id] || 0}
                      modules={course.modules?.length || 0}
                      category={course.category}
                    />
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
