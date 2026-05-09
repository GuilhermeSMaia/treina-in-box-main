import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useEnrollmentStatus() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["enrollment-status", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("enrollment_status")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data.enrollment_status;
    },
    staleTime: 60_000,
  });

  return {
    enrollmentStatus: data ?? "blocked",
    isExpired: data === "expired",
    isBlocked: data === "blocked" || !data,
    isLoadingStatus: isLoading,
  };
}
