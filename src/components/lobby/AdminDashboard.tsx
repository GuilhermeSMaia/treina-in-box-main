import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from "recharts";
import { Users, GraduationCap, BarChart3, MessageSquare } from "lucide-react";

const barConfig: ChartConfig = {
  studentCount: { label: "Alunos", color: "hsl(var(--gold))" },
};

const lineConfig: ChartConfig = {
  completions: { label: "Conclusões", color: "hsl(var(--gold))" },
  posts: { label: "Posts", color: "hsl(var(--accent))" },
};

export function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const summaryCards = [
    { title: "Treinamentos", value: data.totalTrainings, icon: GraduationCap },
    { title: "Alunos Inscritos", value: data.totalStudents, icon: Users },
    { title: "Conclusão Média", value: `${data.avgCompletionRate}%`, icon: BarChart3 },
    { title: "Posts na Praça", value: data.totalPosts, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gold">Painel Administrativo</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <div
            key={c.title}
            className="rounded-xl border border-gold/30 bg-lobby-card p-4 space-y-1"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                {c.title}
              </p>
              <c.icon className="h-4 w-4 text-gold/60" />
            </div>
            <p className="text-xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Training Table */}
      {data.trainingMetrics.length > 0 && (
        <div className="rounded-xl border border-gold/30 bg-lobby-card overflow-hidden">
          <div className="p-4 border-b border-gold/20">
            <h3 className="text-sm font-semibold text-gold">Métricas por Treinamento</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-xs">
                  <th className="text-left p-3">Treinamento</th>
                  <th className="text-center p-3">Alunos</th>
                  <th className="text-left p-3 min-w-[140px]">Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {data.trainingMetrics.map((m) => (
                  <tr key={m.trainingId} className="border-b border-border/30">
                    <td className="p-3 font-medium text-foreground">{m.trainingTitle}</td>
                    <td className="p-3 text-center text-foreground">{m.studentCount}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress value={m.completionRate} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-9 text-right">
                          {m.completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar: Students per training */}
        {data.trainingMetrics.length > 0 && (
          <div className="rounded-xl border border-gold/30 bg-lobby-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gold">Alunos por Treinamento</h3>
            <ChartContainer config={barConfig} className="h-[220px] w-full">
              <BarChart data={data.trainingMetrics}>
                <XAxis dataKey="trainingTitle" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="studentCount" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        )}

        {/* Line: Daily activity */}
        <div className="rounded-xl border border-gold/30 bg-lobby-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gold">Atividade (últimos 7 dias)</h3>
          <ChartContainer config={lineConfig} className="h-[220px] w-full">
            <LineChart data={data.dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="completions"
                stroke="hsl(var(--gold))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="posts"
                stroke="hsl(var(--accent-foreground))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
