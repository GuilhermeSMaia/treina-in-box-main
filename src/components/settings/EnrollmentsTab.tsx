import { useState } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/settings/TablePagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2 } from "lucide-react";

export function EnrollmentsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTraining, setSelectedTraining] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trainings").select("id, title").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments", selectedTraining],
    queryFn: async () => {
      if (!selectedTraining) return [];
      const { data, error } = await supabase
        .from("training_enrollments")
        .select("id, user_id, enrolled_at")
        .eq("training_id", selectedTraining);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedTraining,
  });

  const enrolledUserIds = new Set(enrollments.map((e) => e.user_id));

  const addEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedTraining || !selectedUser) throw new Error("Selecione treinamento e aluno");
      const { error } = await supabase.from("training_enrollments").insert({
        training_id: selectedTraining,
        user_id: selectedUser,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Aluno matriculado no treinamento" });
      setSelectedUser("");
      queryClient.invalidateQueries({ queryKey: ["enrollments", selectedTraining] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao matricular", description: err.message, variant: "destructive" });
    },
  });

  const removeEnrollment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_enrollments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Matrícula removida" });
      queryClient.invalidateQueries({ queryKey: ["enrollments", selectedTraining] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    },
  });

  const getUserName = (userId: string) =>
    students.find((s) => s.user_id === userId)?.full_name || "Sem nome";

  const availableStudents = students.filter((s) => !enrolledUserIds.has(s.user_id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Matrículas</CardTitle>
        <CardDescription>Vincule alunos a treinamentos específicos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select value={selectedTraining} onValueChange={setSelectedTraining}>
              <SelectTrigger><SelectValue placeholder="Selecione um treinamento" /></SelectTrigger>
              <SelectContent>
                {trainings.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTraining && (
            <>
              <div className="flex-1">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
                  <SelectContent>
                    {availableStudents.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || "Sem nome"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => addEnrollment.mutate()} disabled={!selectedUser || addEnrollment.isPending}>
                <UserPlus className="mr-1 h-4 w-4" />Matricular
              </Button>
            </>
          )}
        </div>

        {selectedTraining && (
          isLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aluno matriculado neste treinamento.</p>
          ) : (
            <EnrollmentsTableWithPagination enrollments={enrollments} getUserName={getUserName} removeEnrollment={removeEnrollment} />
          )
        )}
      </CardContent>
    </Card>
  );
}

function EnrollmentsTableWithPagination({ enrollments, getUserName, removeEnrollment }: { enrollments: any[]; getUserName: (id: string) => string; removeEnrollment: any }) {
  const pagination = useTablePagination(enrollments);
  return (
    <>
      <div className="overflow-x-auto -mx-6 px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Inscrito em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedItems.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{getUserName(e.user_id)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(e.enrolled_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="destructive" onClick={() => removeEnrollment.mutate(e.id)} disabled={removeEnrollment.isPending}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        hasNextPage={pagination.hasNextPage}
        hasPrevPage={pagination.hasPrevPage}
        onNextPage={pagination.nextPage}
        onPrevPage={pagination.prevPage}
        onGoToPage={pagination.goToPage}
      />
    </>
  );
}
