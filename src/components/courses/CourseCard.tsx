import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, BookOpen } from "lucide-react";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  duration: string;
  students: number;
  modules: number;
  category: string;
  price?: number;
  progress?: number;
}

export function CourseCard({
  id,
  title,
  description,
  thumbnail,
  instructor,
  duration,
  students,
  modules,
  category,
  price = 0,
  progress,
}: CourseCardProps) {
  const formatPrice = (value: number) => {
    if (value === 0) return "Gratuito";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };
  return (
    <Link to={`/course/${id}`}>
      <Card variant="interactive" className="overflow-hidden h-full flex flex-col">
        <div className="relative">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <Badge variant="secondary">
              {category}
            </Badge>
            <Badge variant={price === 0 ? "default" : "secondary"} className={price === 0 ? "bg-green-600 hover:bg-green-700" : "bg-primary"}>
              {formatPrice(price)}
            </Badge>
          </div>
          {progress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
              <div 
                className="h-full bg-gradient-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <h3 className="font-bold text-lg line-clamp-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{instructor}</p>
        </CardHeader>

        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        </CardContent>

        <CardFooter className="pt-4 border-t">
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{modules} módulos</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{students}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
