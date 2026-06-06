import { useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Trash2, Send, Pencil, X } from "lucide-react";
import { useContentPosts, ContentPost } from "@/hooks/useContentPosts";
import { useUserRole } from "@/hooks/useUserRole";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useProfile } from "@/hooks/useProfile";

const Conteudo = () => {
  const { trainingId } = useParams();
  const { posts, isLoading, createPost, updatePost, deletePost, uploadImage } = useContentPosts(trainingId);
  const { isAdminOrOwner, isMentor } = useUserRole();
  const canEdit = isAdminOrOwner || isMentor;

  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handlePublish = () => {
    if (!content.trim() || content === "<p></p>") return;
    createPost.mutate(content, { onSuccess: () => setContent("") });
  };

  const startEdit = (post: ContentPost) => {
    setEditingId(post.id);
    setEditContent(post.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = () => {
    if (!editingId || !editContent.trim() || editContent === "<p></p>") return;
    updatePost.mutate(
      { id: editingId, content: editContent },
      { onSuccess: cancelEdit }
    );
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deletePost.mutate(deleteTargetId, { onSuccess: () => setDeleteTargetId(null) });
  };

  const {data: profile} = useProfile();
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Conteúdo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Materiais e recursos publicados pela equipe do treinamento.
          </p>
        </div>

        {canEdit && (
          <Card className="border shadow-none">
            <CardContent className="pt-5 pb-4 space-y-3">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Publique um novo conteúdo..."
                onUploadImage={uploadImage}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={!content.trim() || content === "<p></p>" || createPost.isPending}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Publicar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {posts.length === 0 ? (
          <Card className="border shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-xl bg-secondary p-4 mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-base font-medium text-foreground mb-1">Conteúdo em breve</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Os conteúdos aparecerão aqui quando forem publicados pela equipe.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const isEditing = editingId === post.id;
              const initials = `${profile?.username?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "U";

              return (
                <Card key={post.id} className="border shadow-none">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={post.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs bg-secondary text-muted-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {profile?.username ?? "Usuário"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          {canEdit && !isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                onClick={() => startEdit(post)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteTargetId(post.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="mt-2 space-y-3">
                            <RichTextEditor
                              content={editContent}
                              onChange={setEditContent}
                              placeholder="Edite o conteúdo..."
                              onUploadImage={uploadImage}
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={cancelEdit}>
                                <X className="mr-1.5 h-3.5 w-3.5" /> Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                disabled={!editContent.trim() || editContent === "<p></p>" || updatePost.isPending}
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <RichTextDisplay content={post.content} className="mt-1" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Este conteúdo será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Conteudo;
