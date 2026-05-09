import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, format } from "date-fns";

export interface TrainingMetric {
  trainingId: string;
  trainingTitle: string;
  studentCount: number;
  completionRate: number;
}

export interface DailyActivity {
  date: string;
  completions: number;
  posts: number;
}

export interface AdminDashboardData {
  totalTrainings: number;
  totalStudents: number;
  avgCompletionRate: number;
  totalPosts: number;
  trainingMetrics: TrainingMetric[];
  dailyActivity: DailyActivity[];
}

export function useAdminDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-dashboard", user?.id],
    queryFn: async (): Promise<AdminDashboardData> => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const [
        { data: trainings },
        { data: enrollments },
        { data: modules },
        { data: lessons },
        { data: completions },
        { data: posts },
        { data: recentCompletions },
        { data: recentPosts },
      ] = await Promise.all([
        supabase.from("trainings").select("id, title"),
        supabase.from("training_enrollments").select("id, user_id, training_id"),
        supabase.from("training_modules").select("id, training_id"),
        supabase.from("training_lessons").select("id, module_id"),
        supabase.from("lesson_completions").select("id, lesson_id, user_id"),
        supabase.from("plaza_posts").select("id, training_id"),
        supabase.from("lesson_completions").select("id, completed_at").gte("completed_at", sevenDaysAgo),
        supabase.from("plaza_posts").select("id, created_at").gte("created_at", sevenDaysAgo),
      ]);

      const trainingMap = new Map((trainings ?? []).map((t) => [t.id, t.title]));
      const moduleTrainingMap = new Map((modules ?? []).map((m) => [m.id, m.training_id]));

      // Lessons per training
      const lessonsPerTraining = new Map<string, Set<string>>();
      for (const l of lessons ?? []) {
        const tId = moduleTrainingMap.get(l.module_id);
        if (!tId) continue;
        if (!lessonsPerTraining.has(tId)) lessonsPerTraining.set(tId, new Set());
        lessonsPerTraining.get(tId)!.add(l.id);
      }

      // Completions set
      const completionSet = new Set((completions ?? []).map((c) => `${c.user_id}_${c.lesson_id}`));

      // Build training metrics
      const trainingMetrics: TrainingMetric[] = (trainings ?? []).map((trn) => {
        const trainingEnrollments = (enrollments ?? []).filter((e) => e.training_id === trn.id);
        const trainingLessons = lessonsPerTraining.get(trn.id) ?? new Set();
        const totalPossible = trainingEnrollments.length * trainingLessons.size;

        let completed = 0;
        if (totalPossible > 0) {
          for (const e of trainingEnrollments) {
            for (const lessonId of trainingLessons) {
              if (completionSet.has(`${e.user_id}_${lessonId}`)) completed++;
            }
          }
        }

        return {
          trainingId: trn.id,
          trainingTitle: trn.title,
          studentCount: trainingEnrollments.length,
          completionRate: totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0,
        };
      });

      const totalStudents = new Set((enrollments ?? []).map((e) => e.user_id)).size;
      const avgCompletionRate =
        trainingMetrics.length > 0
          ? Math.round(trainingMetrics.reduce((s, c) => s + c.completionRate, 0) / trainingMetrics.length)
          : 0;

      // Daily activity (last 7 days)
      const dayMap = new Map<string, { completions: number; posts: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        dayMap.set(d, { completions: 0, posts: 0 });
      }
      for (const c of recentCompletions ?? []) {
        const d = format(new Date(c.completed_at), "yyyy-MM-dd");
        if (dayMap.has(d)) dayMap.get(d)!.completions++;
      }
      for (const p of recentPosts ?? []) {
        const d = format(new Date(p.created_at), "yyyy-MM-dd");
        if (dayMap.has(d)) dayMap.get(d)!.posts++;
      }

      const dailyActivity: DailyActivity[] = Array.from(dayMap.entries()).map(([date, v]) => ({
        date: format(new Date(date), "dd/MM"),
        ...v,
      }));

      return {
        totalTrainings: (trainings ?? []).length,
        totalStudents,
        avgCompletionRate,
        totalPosts: (posts ?? []).length,
        trainingMetrics,
        dailyActivity,
      };
    },
    enabled: !!user?.id,
  });
}
