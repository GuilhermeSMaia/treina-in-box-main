import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LiveSession {
  id: string;
  training_id: string;
  title: string;
  meeting_url: string | null;
  scheduled_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function useLiveSessions(trainingId: string | undefined) {
  return useQuery({
    queryKey: ["live-sessions", trainingId],
    queryFn: async (): Promise<LiveSession[]> => {
      if (!trainingId) return [];
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("training_id", trainingId)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!trainingId,
  });
}
