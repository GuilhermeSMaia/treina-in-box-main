import { useState } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/settings/TablePagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, ShieldCheck, ShieldOff, RefreshCw } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProfileWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  enrollment_status: string;
  role: AppRole | null;
}

export function UsersTab() {
  const { user } = useAuth();
  const { isOwner } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, enrollment_status")
        .order("full_name", { ascending: true });
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map<string, AppRole>();
      for (const r of roles ?? []) {
        roleMap.set(r.user_id, r.role as AppRole);
      }

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.user_id) ?? null,
      })) as ProfileWithRole[];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ targetUserId, newRole }: { targetUserId: string; newRole: AppRole }) => {
      const { data, error } = await supabase.functions.invoke("manage-user-role", {
        body: { target_user_id: targetUserId, role: newRole, action: "assign" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: "Role atualizada com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao alterar role", description: err.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ enrollment_status: status })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status atualizado" });
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });

  const filtered = users.filter((p) => {
    const q = search.toLowerCase();
    return !q || (p.full_name ?? "").toLowerCase().includes(q);
  });

  const pagination = useTablePagination(filtered);

  const roleBadge = (role: AppRole | null) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      owner: { label: "Proprietário", variant: "default" },
      admin: { label: "Admin", variant: "secondary" },
      mentor: { label: "Mentor", variant: "outline" },
      student: { label: "Aluno", variant: "outline" },
    };
    if (!role) return <Badge variant="outline">Sem role</Badge>;
    const s = map[role] ?? { label: role, variant: "outline" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Ativo", variant: "default" },
      blocked: { label: "Bloqueado", variant: "destructive" },
      expired: { label: "Expirado", variant: "outline" },
    };
    const s = map[status] ?? { label: status, variant: "outline" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const allowedRoles: AppRole[] = isOwner ? ["admin", "mentor", "student"] : ["mentor", "student"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Gestão de Usuários</CardTitle>
        <CardDescription>Gerencie roles e status dos usuários.</CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "Sem nome"}</TableCell>
                      <TableCell>{roleBadge(p.role)}</TableCell>
                      <TableCell>{statusBadge(p.enrollment_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.role !== "owner" && p.user_id !== user?.id && (
                            <Select
                              value={p.role ?? ""}
                              onValueChange={(v) => changeRole.mutate({ targetUserId: p.user_id, newRole: v as AppRole })}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue placeholder="Role" />
                              </SelectTrigger>
                              <SelectContent>
                                {allowedRoles.map((r) => (
                                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {p.enrollment_status !== "active" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ userId: p.user_id, status: "active" })} disabled={updateStatus.isPending}>
                              <RefreshCw className="mr-1 h-3 w-3" />Renovar
                            </Button>
                          )}
                          {p.enrollment_status !== "blocked" && p.role !== "owner" && (
                            <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ userId: p.user_id, status: "blocked" })} disabled={updateStatus.isPending}>
                              <ShieldOff className="mr-1 h-3 w-3" />Bloquear
                            </Button>
                          )}
                        </div>
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
        )}
      </CardContent>
    </Card>
  );
}
