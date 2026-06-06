/**
 * Extrai uma mensagem legível de qualquer valor capturado em catch.
 * Use sempre que precisar exibir um erro para o usuário.
 */
export function getErrorMessage(err: unknown, fallback = "Ocorreu um erro. Tente novamente."): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string" && err.trim().length > 0) return err.trim();
  return fallback;
}

export function handleError(
  err: unknown,
  setError: (msg: string) => void,
  fallback?: string
): void {
  setError(getErrorMessage(err, fallback));
}