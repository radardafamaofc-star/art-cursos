import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface CreatorBadgeProps {
  className?: string;
}

export function CreatorBadge({ className }: CreatorBadgeProps) {
  const { profile } = useAuth();

  if (!profile || (profile.role !== 'professor' && profile.role !== 'admin')) {
    return null;
  }

  return (
    <Badge 
      className={`bg-gradient-primary text-primary-foreground border-0 gap-1 ${className}`}
    >
      <Crown className="h-3 w-3" />
      {profile.role === 'admin' ? 'Admin' : 'Criador'}
    </Badge>
  );
}
