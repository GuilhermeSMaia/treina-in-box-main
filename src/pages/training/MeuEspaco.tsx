import { useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Send, Trash2, Pencil, X, AlertCircle } from "lucide-react";
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
import { useSpacePosts, SpacePost } from "@/hooks/useSpacePosts";
import { useEnrollmentStatus } from "@/hooks/useEnrollmentStatus";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichTextDisplay } from "@/components/RichTextDisplay";

const MeuEspaco = () => {
  const { trainingId } = useParams();
  const { posts, isLoading, createPost, updatePost, deletePost, uploadImage } =
    useSpacePosts(trainingId);
  const { isExpired } = useEnrollmentStatus();
  const canPost = !isExpired;

  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!content.trim() || content === "<p></p>") return;
    createPost.mutate(content, { onSuccess: () => setContent("") });
  };

  const startEdit = (post: SpacePost) => {
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
    deletePost.mutate(deleteTargetId, {
      onSuccess: () => setDeleteTargetId(null),
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Meu Espaço</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suas anotações pessoais e materiais de estudo.
          </p>
        </div>

        {isExpired && (
          <Alert
            variant="destructive"
            className="border-destructive/30 bg-destructive/5"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Seu acesso expirou — suas notas estão em modo apenas leitura.
            </AlertDescription>
          </Alert>
        )}

        {canPost && (
          <Card className="border shadow-none">
            <CardContent className="pt-5 pb-4 space-y-3">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Escreva uma anotação..."
                onUploadImage={uploadImage}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    !content.trim() ||
                    content === "<p></p>" ||
                    createPost.isPending
                  }
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {createPost.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {posts.length === 0 ? (
          <Card className="border shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-xl bg-secondary p-4 mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-base font-medium text-foreground mb-1">
                Nenhuma anotação ainda
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Comece a registrar suas anotações e materiais de estudo!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const isEditing = editingId === post.id;

              return (
                <Card key={post.id} className="border shadow-none">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          {!isEditing && !isExpired && (
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
                                disabled={deletePost.isPending}
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
                              placeholder="Edite sua anotação..."
                              onUploadImage={uploadImage}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEdit}
                              >
                                <X className="mr-1.5 h-3.5 w-3.5" /> Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                disabled={
                                  !editContent.trim() ||
                                  editContent === "<p></p>" ||
                                  updatePost.isPending
                                }
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <RichTextDisplay
                            content={post.content}
                            className="mt-1"
                          />
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

      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta anotação será removida permanentemente. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default MeuEspaco;
