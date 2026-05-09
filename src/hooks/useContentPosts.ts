import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ContentPost {
  id: string;
  training_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useContentPosts(trainingId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["content-posts", trainingId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!trainingId) return [];
      const { data: posts, error } = await supabase
        .from("content_posts")
        .select("*")
        .eq("training_id", trainingId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((posts ?? []).map((p) => p.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      return (posts ?? []).map((p) => ({
        ...p,
        profile: profileMap.get(p.user_id) ?? undefined,
      })) as ContentPost[];
    },
    enabled: !!trainingId,
  });

  const createPost = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !trainingId) throw new Error("Não autorizado");
      const { error } = await supabase.from("content_posts").insert({
        training_id: trainingId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao publicar conteúdo. Tente novamente."),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("content_posts")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao atualizar conteúdo."),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("content_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao deletar conteúdo."),
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("post-images").upload(path, file);
    if (error) {
      toast.error("Erro ao enviar imagem.");
      return null;
    }
    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading,
    createPost,
    updatePost,
    deletePost,
    uploadImage,
  };
}
