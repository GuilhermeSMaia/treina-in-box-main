import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SpacePost {
  id: string;
  training_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useSpacePosts(trainingId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["space-posts", trainingId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!trainingId) return [];
      const { data, error } = await supabase
        .from("space_posts")
        .select("*")
        .eq("training_id", trainingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SpacePost[];
    },
    enabled: !!trainingId,
  });

  const createPost = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !trainingId) throw new Error("Não autorizado");
      const { error } = await supabase.from("space_posts").insert({
        training_id: trainingId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao salvar anotação. Tente novamente."),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("space_posts")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao atualizar anotação."),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("space_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao deletar anotação."),
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("note-images").upload(path, file);
    if (error) {
      toast.error("Erro ao enviar imagem.");
      return null;
    }
    const { data: urlData } = supabase.storage.from("note-images").getPublicUrl(path);
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
