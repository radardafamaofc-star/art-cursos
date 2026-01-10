import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatorSubscriptionModal } from "./CreatorSubscriptionModal";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Admin user ID for payment configuration
const ADMIN_USER_ID = "e2476f63-b58b-43b1-a8fb-b85e9a237f14";

export function BecomeCreatorBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, profile } = useAuth();

  // Check if user already has an active subscription
  const { data: subscription } = useQuery({
    queryKey: ['creator-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('creator_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Don't show banner if user is admin, professor, or already has active subscription
  if (!user || !profile) return null;
  if (profile.role === 'admin' || profile.role === 'professor') return null;
  if (subscription) return null;

  return (
    <>
      <div className="w-full flex justify-center py-3 bg-primary/5 border-b border-primary/10">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-primary px-6"
          size="sm"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Torne-se um Criador de Conteúdo
        </Button>
      </div>

      <CreatorSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        adminId={ADMIN_USER_ID}
        onSuccess={() => {
          setIsModalOpen(false);
          window.location.href = '/student';
        }}
      />
    </>
  );
}
