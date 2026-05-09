import { BookOpen, ArrowRight, Layers } from "lucide-react";
import type { DashboardData } from "@/hooks/useDashboardData";

interface Props {
  trainings: DashboardData["trainings"];
  onNavigate: (id: string) => void;
}

export function LobbyTrainings({ trainings, onNavigate }: Props) {
  if (trainings.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white">Seus Treinamentos</h2>
        <div className="rounded-xl border border-dashed border-gold/20 bg-lobby-card p-12 text-center">
          <Layers className="mx-auto h-8 w-8 text-gold-muted/50 mb-3" />
          <p className="text-sm text-gold-muted">
            Nenhum treinamento cadastrado ainda.
          </p>
          <p className="text-xs text-gold-muted/70 mt-1">
            Crie seu primeiro treinamento nas configurações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Seus Treinamentos</h2>
        <span className="text-xs text-gold-muted">
          {trainings.length} {trainings.length === 1 ? "treinamento" : "treinamentos"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainings.map((t) => (
            <button
              key={t.id}
              onClick={() => onNavigate(t.id)}
              className="group text-left rounded-xl border border-gold/20 bg-lobby-card p-5 transition-all hover:border-gold/50 hover:shadow-lg hover:shadow-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                  {t.title}
                </h3>
                <ArrowRight className="h-4 w-4 shrink-0 text-gold-muted opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
              </div>

              {t.description && (
                <p className="text-xs text-gold-muted mb-3 line-clamp-2">
                  {t.description}
                </p>
              )}

              <div className="flex items-center gap-1 text-[11px] text-gold-muted">
                <BookOpen className="h-3 w-3" />
                <span>{t.moduleCount} módulos</span>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
