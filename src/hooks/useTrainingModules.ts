import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface TrainingLesson {
  id: string;
  module_id: string;
  title: string;
  content_url: string | null;
  position: number;
  created_at: string;
}

export interface TrainingModule {
  id: string;
  training_id: string;
  title: string;
  position: number;
  created_at: string;
  lessons: TrainingLesson[];
}

interface CompletionRecord {
  lesson_id: string;
}

export function useTrainingModules(trainingId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const moduleQueryKey = ["training-modules", trainingId];

  const modulesQuery = useQuery({
    queryKey: moduleQueryKey,
    queryFn: async (): Promise<TrainingModule[]> => {
      if (!trainingId) return [];
      const { data: modules, error: modErr } = await supabase
        .from("training_modules")
        .select("*")
        .eq("training_id", trainingId)
        .order("position");
      if (modErr) throw modErr;
      if (!modules?.length) return [];

      const moduleIds = modules.map((m) => m.id);
      const { data: lessons, error: lesErr } = await supabase
        .from("training_lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("position");
      if (lesErr) throw lesErr;

      return modules.map((m) => ({
        ...m,
        lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
      }));
    },
    enabled: !!trainingId,
  });

  const completionsQuery = useQuery({
    queryKey: ["lesson-completions", trainingId, user?.id],
    queryFn: async (): Promise<Set<string>> => {
      if (!user?.id || !trainingId) return new Set();
      const allLessonIds = (modulesQuery.data ?? []).flatMap((m) =>
        m.lessons.map((l) => l.id)
      );
      if (!allLessonIds.length) return new Set();
      const { data, error } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user.id)
        .in("lesson_id", allLessonIds);
      if (error) throw error;
      return new Set((data as CompletionRecord[]).map((c) => c.lesson_id));
    },
    enabled: !!user?.id && !!trainingId && !!modulesQuery.data,
  });

  const toggleCompletion = useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      if (!user?.id) throw new Error("Não autenticado");
      if (completed) {
        const { error } = await supabase
          .from("lesson_completions")
          .insert({ lesson_id: lessonId, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lesson_completions")
          .delete()
          .eq("lesson_id", lessonId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onMutate: async ({ lessonId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["lesson-completions", trainingId, user?.id] });
      const previous = queryClient.getQueryData<Set<string>>(["lesson-completions", trainingId, user?.id]);
      queryClient.setQueryData<Set<string>>(
        ["lesson-completions", trainingId, user?.id],
        (old) => {
          const next = new Set(old);
          if (completed) next.add(lessonId);
          else next.delete(lessonId);
          return next;
        }
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["lesson-completions", trainingId, user?.id], context.previous);
      }
      toast({ title: "Erro ao atualizar progresso", description: "Tente novamente.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-completions", trainingId, user?.id] });
    },
  });

  // --- Module CRUD ---

  const createModule = useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      if (!trainingId) throw new Error("Training ID ausente");
      const nextPosition = (modulesQuery.data ?? []).length;
      const { error } = await supabase
        .from("training_modules")
        .insert({ training_id: trainingId, title, position: nextPosition });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moduleQueryKey });
      toast({ title: "Módulo criado" });
    },
    onError: () => {
      toast({ title: "Erro ao criar módulo", variant: "destructive" });
    },
  });

  const updateModule = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("training_modules")
        .update({ title })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moduleQueryKey });
      toast({ title: "Módulo atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar módulo", variant: "destructive" });
    },
  });

  const deleteModule = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // Delete lessons first (no cascade)
      const { error: lesErr } = await supabase
        .from("training_lessons")
        .delete()
        .eq("module_id", id);
      if (lesErr) throw lesErr;
      const { error } = await supabase
        .from("training_modules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moduleQueryKey });
      toast({ title: "Módulo excluído" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir módulo", variant: "destructive" });
    },
  });

  // --- Lesson CRUD ---

  const createLesson = useMutation({
    mutationFn: async ({ moduleId, title, contentUrl }: { moduleId: string; title: string; contentUrl?: string }) => {
      const mod = (modulesQuery.data ?? []).find((m) => m.id === moduleId);
      const nextPosition = mod ? mod.lessons.length : 0;
      const { error } = await supabase
        .from("training_lessons")
        .insert({ module_id: moduleId, title, content_url: contentUrl || null, position: nextPosition });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moduleQueryKey });
      toast({ title: "Lição criada" });
    },
    onError: () => {
      toast({ title: "Erro ao criar lição", variant: "destructive" });
    },
  });

  const updateLesson = useMutation({
    mutationFn: async ({ id, title, contentUrl }: { id: string; title: string; contentUrl?: string }) => {
      const { error } = await supabase
        .from("training_lessons")
        .update({ title, content_url: contentUrl || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moduleQueryKey });
      toast({ title: "Lição atualizada" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar lição", variant: "destructive" });
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("training_lessons")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moduleQueryKey });
      toast({ title: "Lição excluída" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir lição", variant: "destructive" });
    },
  });

  return {
    modules: modulesQuery.data ?? [],
    isLoadingModules: modulesQuery.isLoading,
    completions: completionsQuery.data ?? new Set<string>(),
    isLoadingCompletions: completionsQuery.isLoading,
    toggleCompletion,
    createModule,
    updateModule,
    deleteModule,
    createLesson,
    updateLesson,
    deleteLesson,
  };
}
