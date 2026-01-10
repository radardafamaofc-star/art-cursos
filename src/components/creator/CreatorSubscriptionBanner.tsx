import { useState } from "react";
import { Sparkles, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatorSubscriptionModal } from "./CreatorSubscriptionModal";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

// Admin user ID for payment configuration
const ADMIN_USER_ID = "e2476f63-b58b-43b1-a8fb-b85e9a237f14";

export function CreatorSubscriptionBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, profile } = useAuth();

  // Fetch user's active subscription
  const { data: subscription, isLoading } = useQuery({
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

  // Don't show anything while loading
  if (isLoading) return null;
  
  // Don't show banner if not logged in or no profile
  if (!user || !profile) return null;
  
  // Admin doesn't need subscription
  if (profile.role === 'admin') return null;

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!subscription?.expires_at) return 0;
    const expiresAt = new Date(subscription.expires_at);
    const today = new Date();
    return Math.max(0, differenceInDays(expiresAt, today));
  };

  const daysRemaining = getDaysRemaining();
  const showRenewButton = daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining === 0 && subscription;
  
  // Check if user has subscription (is a creator) - either professor role OR has active subscription
  const isCreator = profile.role === 'professor' || subscription;

  // Creator with active subscription - show countdown
  if (isCreator && subscription && !isExpired) {
    return (
      <>
        <div className="w-full flex justify-center py-3 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                Sua assinatura expira em{" "}
                <span className={`font-semibold ${daysRemaining <= 7 ? 'text-destructive' : 'text-primary'}`}>
                  {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                </span>
              </span>
            </div>
            
            {showRenewButton && (
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-primary px-4"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Renovar
              </Button>
            )}
          </div>
        </div>

        <CreatorSubscriptionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          adminId={ADMIN_USER_ID}
          isRenewal={true}
          onSuccess={() => {
            setIsModalOpen(false);
            window.location.href = '/student?subscription=renewed';
          }}
        />
      </>
    );
  }

  // Creator with expired subscription
  if (isCreator && isExpired) {
    return (
      <>
        <div className="w-full flex justify-center py-3 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center gap-4">
            <span className="text-sm text-destructive font-medium">
              Sua assinatura expirou
            </span>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-primary px-4"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Renovar Agora
            </Button>
          </div>
        </div>

        <CreatorSubscriptionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          adminId={ADMIN_USER_ID}
          isRenewal={true}
          onSuccess={() => {
            setIsModalOpen(false);
            window.location.href = '/student?subscription=renewed';
          }}
        />
      </>
    );
  }

  // User is NOT a creator - show "Become Creator" button
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
        isRenewal={false}
        onSuccess={() => {
          setIsModalOpen(false);
          window.location.href = '/student';
        }}
      />
    </>
  );
}
