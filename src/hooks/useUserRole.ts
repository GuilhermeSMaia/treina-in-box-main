import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useUserRole() {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
    enabled: !!user?.id,
  });

  return {
    roles,
    isLoading,
    isOwner: roles.includes("owner"),
    isAdmin: roles.includes("admin"),
    isMentor: roles.includes("mentor"),
    isStudent: roles.includes("student"),
    isAdminOrOwner: roles.includes("admin") || roles.includes("owner"),
  };
}
