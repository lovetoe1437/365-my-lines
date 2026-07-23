export interface EditorApiResult {
  ok?: boolean;
  id?: string | number;
  message?: string;
}

interface ExpiredSessionOptions {
  response: Response;
  result: EditorApiResult;
  messageElement?: HTMLElement | null;
  dialog?: HTMLDialogElement | null;
  onExpired?: () => void;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function readEditorResponse(response: Response): Promise<EditorApiResult> {
  try {
    const result = (await response.json()) as unknown;
    if (!isObject(result)) return {};

    return {
      ok: typeof result.ok === "boolean" ? result.ok : undefined,
      id:
        typeof result.id === "string" || typeof result.id === "number"
          ? result.id
          : undefined,
      message: typeof result.message === "string" ? result.message : undefined,
    };
  } catch {
    return {};
  }
}

export function readEditorDraft<T extends object>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const draft = JSON.parse(stored) as unknown;
    if (!isObject(draft)) {
      clearEditorDraft(key);
      return null;
    }

    return draft as T;
  } catch {
    clearEditorDraft(key);
    return null;
  }
}

export function writeEditorDraft(key: string, draft: Record<string, unknown>): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearEditorDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // The saved draft is optional; storage restrictions must not break editing.
  }
}

export function handleExpiredEditorSession({
  response,
  result,
  messageElement,
  dialog,
  onExpired,
}: ExpiredSessionOptions): boolean {
  if (response.status !== 401) return false;

  if (messageElement) {
    messageElement.textContent = result.message ?? "Сессия завершилась. Войдите снова.";
  }
  dialog?.close();
  onExpired?.();

  window.showAppDialog?.({
    eyebrow: "Доступ к редактору",
    title: "Сессия завершилась",
    message: result.message ?? "Для продолжения необходимо снова войти.",
    actionLabel: "Войти",
    actionHref: "/login",
  });
  return true;
}
