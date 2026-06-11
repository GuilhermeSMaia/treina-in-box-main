import { useState, useMemo } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/settings/TablePagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTrainings } from "@/hooks/useTrainings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageCircle, Link2, Copy, Check, RotateCw, XCircle, Search, Upload } from "lucide-react";
import { BulkImportDialog } from "@/components/settings/BulkImportDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type Channel = "email" | "whatsapp" | "link";

export function InvitationsTab() {
  const { user } = useAuth();
  const { isOwner, isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: trainings = [] } = useTrainings();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AppRole>("student");
  const [channel, setChannel] = useState<Channel>("email");
  const [trainingId, setTrainingId] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [bulkOpen, setBulkOpen] = useState(false);

  const allowedInviteRoles: AppRole[] = isOwner
    ? ["admin", "mentor", "student"]
    : isAdmin
      ? ["mentor", "student"]
      : ["student"];

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const appUrl = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, "");

  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv: any) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchEmail = inv.email?.toLowerCase().includes(q);
        const matchPhone = inv.phone?.toLowerCase().includes(q);
        if (!matchEmail && !matchPhone) return false;
      }
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (filterChannel !== "all" && (inv.channel ?? "email") !== filterChannel) return false;
      if (filterRole !== "all" && inv.role !== filterRole) return false;
      return true;
    });
  }, [invitations, searchQuery, filterStatus, filterChannel, filterRole]);

  const invPagination = useTablePagination(filteredInvitations);

  const sendInvite = useMutation({
    mutationFn: async () => {
  if (!user?.id) throw new Error("Não autenticado");

  const payload: Record<string, unknown> = {
    role,
    invited_by: user.id,
    channel,
    training_id: trainingId && trainingId !== "none" ? trainingId : null,
    email: channel === "email" ? email.trim().toLowerCase() : `link-${Date.now()}@invite`,
    phone: channel === "whatsapp" ? phone.trim() : null,
  };

  const { data, error } = await supabase
    .from("invitations")
    .insert(payload as any)
    .select()
    .single();

  if (error) throw error;

  // Se o token não veio no insert (trigger assíncrono), busca novamente
  if (!data.invite_token) {
    const { data: fetched, error: fetchError } = await supabase
      .from("invitations")
      .select("*")
      .eq("id", data.id)
      .single();

    if (fetchError) throw fetchError;
    if (!fetched.invite_token) throw new Error("Token não gerado. Verifique o trigger no Supabase.");
    return fetched;
  }

  return data;
},    onSuccess: (data) => {
      const inviteLink = `${appUrl}/?invite=${data.invite_token}`;

      if (channel === "whatsapp") {
        const cleanPhone = phone.replace(/\D/g, "");
        const msg = encodeURIComponent(
          `Você foi convidado para participar do treinamento na Treina in Box! Acesse: ${inviteLink}`
        );
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
        toast({ title: "Convite criado", description: "WhatsApp aberto com o link de convite." });
      } else if (channel === "link") {
        navigator.clipboard.writeText(inviteLink);
        toast({ title: "Link gerado e copiado!", description: inviteLink });
      } else {
        toast({ title: "Convite enviado", description: `Convite para ${email} registrado com sucesso.` });
      }

      setEmail("");
      setPhone("");
      setRole("student");
      setTrainingId("");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao enviar convite", description: err.message, variant: "destructive" });
    },
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Convite cancelado" });
      setCancellingId(null);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cancelar", description: err.message, variant: "destructive" });
    },
  });

  const resendInvite = (inv: any) => {
    const inviteLink = `${appUrl}/?invite=${inv.invite_token}`;
    const ch = inv.channel ?? "email";
    if (ch === "whatsapp") {
      const cleanPhone = (inv.phone ?? "").replace(/\D/g, "");
      const msg = encodeURIComponent(`Você foi convidado para participar do treinamento na Treina in Box! Acesse: ${inviteLink}`);
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
      toast({ title: "WhatsApp aberto com o convite" });
    } else if (ch === "link") {
      navigator.clipboard.writeText(inviteLink);
      toast({ title: "Link copiado novamente!" });
    } else {
      navigator.clipboard.writeText(inviteLink);
      toast({ title: "Link do convite copiado", description: `Envie manualmente para ${inv.email}` });
    }
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${appUrl}/?invite=${token}`);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      accepted: { label: "Aceito", variant: "default" },
      expired: { label: "Expirado", variant: "outline" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };
    const s = map[status] ?? { label: status, variant: "outline" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const channelIcon = (ch: string) => {
    if (ch === "whatsapp") return <MessageCircle className="h-3.5 w-3.5" />;
    if (ch === "link") return <Link2 className="h-3.5 w-3.5" />;
    return <Mail className="h-3.5 w-3.5" />;
  };

  const channelLabel = (ch: string) => {
    if (ch === "whatsapp") return "WhatsApp";
    if (ch === "link") return "Link";
    return "Email";
  };

  const trainingName = (tid: string | null) => {
    if (!tid) return "—";
    return trainings.find((t) => t.id === tid)?.title ?? tid;
  };

  const canSubmit = () => {
    if (channel === "email") return email.trim().length > 0;
    if (channel === "whatsapp") return phone.trim().length > 0;
    return true;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Enviar Convite</CardTitle>
            <CardDescription>Convide novos usuários por email, WhatsApp ou link.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Importar Lista
          </Button>
        </CardHeader>
        <BulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} />
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); if (canSubmit()) sendInvite.mutate(); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Channel */}
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email"><span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />Email</span></SelectItem>
                    <SelectItem value="whatsapp"><span className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</span></SelectItem>
                    <SelectItem value="link"><span className="flex items-center gap-2"><Link2 className="h-3.5 w-3.5" />Gerar Link</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allowedInviteRoles.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r === "admin" ? "Admin" : r === "mentor" ? "Mentor" : "Aluno"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Training */}
              <div className="space-y-1.5">
                <Label>Treinamento</Label>
                <Select value={trainingId} onValueChange={setTrainingId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {trainings.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional input */}
            <div className="flex flex-col sm:flex-row gap-3">
              {channel === "email" && (
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input id="invite-email" type="email" placeholder="usuario@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              )}
              {channel === "whatsapp" && (
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="invite-phone">Telefone (com DDD e código do país)</Label>
                  <Input id="invite-phone" type="tel" placeholder="5511999999999" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              )}
              {channel === "link" && (
                <p className="flex-1 text-sm text-muted-foreground self-end pb-2">
                  O link será gerado automaticamente. Copie e compartilhe.
                </p>
              )}
              <div className="flex items-end">
                <Button type="submit" disabled={sendInvite.isPending || !canSubmit()}>
                  {channel === "email" && <><Mail className="mr-2 h-4 w-4" />Enviar</>}
                  {channel === "whatsapp" && <><MessageCircle className="mr-2 h-4 w-4" />Enviar via WhatsApp</>}
                  {channel === "link" && <><Link2 className="mr-2 h-4 w-4" />Gerar Link</>}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Convites Enviados</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="accepted">Aceito</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os canais</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="student">Aluno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filteredInvitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convite encontrado.</p>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email / Contato</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Treinamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invPagination.paginatedItems.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          {inv.channel === "whatsapp" ? inv.phone || inv.email : inv.email}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-xs">
                            {channelIcon(inv.channel ?? "email")}
                            {channelLabel(inv.channel ?? "email")}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize">{inv.role}</TableCell>
                        <TableCell className="text-xs">{trainingName(inv.training_id)}</TableCell>
                        <TableCell>{statusBadge(inv.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{new Date(inv.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          {inv.invite_token && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLink(inv.invite_token)}
                              className="h-7 px-2"
                            >
                              {copiedId === inv.invite_token ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                          {inv.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendInvite(inv)}
                                className="h-7 px-2"
                                title="Reenviar"
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog open={cancellingId === inv.id} onOpenChange={(o) => !o && setCancellingId(null)}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCancellingId(inv.id)}
                                    className="h-7 px-2 text-destructive hover:text-destructive"
                                    title="Cancelar convite"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      O convite para {inv.email} será cancelado e o link deixará de funcionar.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => cancelInvite.mutate(inv.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Cancelar Convite
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={invPagination.currentPage}
                totalPages={invPagination.totalPages}
                totalItems={invPagination.totalItems}
                hasNextPage={invPagination.hasNextPage}
                hasPrevPage={invPagination.hasPrevPage}
                onNextPage={invPagination.nextPage}
                onPrevPage={invPagination.prevPage}
                onGoToPage={invPagination.goToPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
