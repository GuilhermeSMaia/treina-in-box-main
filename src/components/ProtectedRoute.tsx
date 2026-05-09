import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollmentStatus } from "@/hooks/useEnrollmentStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, signOut } = useAuth();
  const { isBlocked, isLoadingStatus } = useEnrollmentStatus();

  if (loading || (session && isLoadingStatus)) {
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

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (isBlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center gap-4">
        <ShieldX className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold text-foreground">Acesso não autorizado</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Sua conta não possui um convite válido para acessar esta plataforma. Entre em contato com o administrador.
        </p>
        <Button variant="outline" onClick={() => signOut()}>
          Sair
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
