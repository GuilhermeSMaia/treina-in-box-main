import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TrainingGuard({ children }: { children: React.ReactNode }) {
  const { trainingId } = useParams();
  const { user } = useAuth();
  const { isAdminOrOwner, isLoading: rolesLoading } = useUserRole();

  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ["training-access", trainingId, user?.id],
    queryFn: async () => {
      if (!trainingId || !user?.id) return false;
      const { data, error } = await supabase
        .from("training_enrollments")
        .select("id")
        .eq("training_id", trainingId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!trainingId && !!user?.id && !isAdminOrOwner,
  });

  if (rolesLoading || (!isAdminOrOwner && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (isAdminOrOwner || hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center gap-4">
      <ShieldX className="h-12 w-12 text-destructive" />
      <h1 className="text-xl font-semibold text-foreground">Acesso não autorizado</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        Você não está inscrito neste treinamento. Solicite acesso ao mentor ou administrador.
      </p>
      <Button variant="outline" asChild>
        <a href="/treinamentos">Voltar aos treinamentos</a>
      </Button>
    </div>
  );
}
