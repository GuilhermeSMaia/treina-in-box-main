import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Training {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  cover_url: string | null;
  is_paused: boolean;
}

export function useTrainings() {
  return useQuery({
    queryKey: ["trainings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("id, title, description, created_at, cover_url, is_paused")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
