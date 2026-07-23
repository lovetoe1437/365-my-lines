/**
 * Shared editor behaviour for book lines and diary entries.
 *
 * Keeps draft restoration, autosave, character counting and submit handling
 * in one place so both writing screens behave consistently.
 */
import {
  clearEditorDraft,
  handleExpiredEditorSession,
  readEditorDraft,
  readEditorResponse,
  writeEditorDraft,
} from "./editorRuntime";

export type EditorConfig = {
  storageKey: string;
  endpoint: string;
  redirectTo: (id: string | number) => string;
  statusSelector?: string;
  idleButtonLabel: string;
  savingButtonLabel?: string;
  savedButtonLabel?: string;
  promptMessages?: readonly string[];
  successMessages?: readonly string[];
  successDelay?: number;
  autosaveDelay?: number;
  minimumTextareaHeight?: number;
};

const getElement = <T extends Element>(selector: string, type: { new (): T }): T | null => {
  const element = document.querySelector(selector);
  return element instanceof type ? element : null;
};

const chooseMessage = (messages?: readonly string[]): string | undefined => {
  if (!messages?.length) return undefined;
  return messages[Math.floor(Math.random() * messages.length)];
};

export function initEditor(config: EditorConfig): void {
  const form = getElement("#entry-form", HTMLFormElement);
  const content = getElement("#content", HTMLTextAreaElement);
  const status = document.querySelector<HTMLElement>(
    config.statusSelector ?? "#draft-status",
  );
  const count = document.querySelector<HTMLElement>("#character-count");
  const message = document.querySelector<HTMLElement>("#form-message");
  const button = getElement("#save-button", HTMLButtonElement);

  if (!form || !content || !button) return;

  const autosaveDelay = config.autosaveDelay ?? 500;
  const minimumTextareaHeight = config.minimumTextareaHeight ?? 0;
  const successDelay = config.successDelay ?? 850;
  let autosaveTimer: number | undefined;
  let isDirty = false;

  const setButtonState = (state: "idle" | "dirty" | "saving" | "saved"): void => {
    button.dataset.state = state;
    button.disabled = state === "saving" || state === "saved";

    if (state === "saving") {
      button.textContent = config.savingButtonLabel ?? "Сохраняем…";
      return;
    }

    if (state === "saved") {
      button.textContent = config.savedButtonLabel ?? "Сохранено";
      return;
    }

    button.textContent = config.idleButtonLabel;
  };

  const resizeTextarea = (): void => {
    if (minimumTextareaHeight <= 0) return;
    content.style.height = "auto";
    content.style.height = `${Math.max(minimumTextareaHeight, content.scrollHeight)}px`;
  };

  const updateCharacterCount = (): void => {
    if (count) count.textContent = String(content.value.length);
  };

  const setDraftStatus = (text: string, state: "idle" | "saving" | "saved" | "restored"): void => {
    if (!status) return;
    status.textContent = text;
    status.dataset.state = state;
  };

  const saveDraft = (): void => {
    const data = Object.fromEntries(new FormData(form));
    const saved = writeEditorDraft(config.storageKey, data);
    setDraftStatus(
      saved ? "Черновик сохранён" : "Черновик недоступен",
      saved ? "saved" : "idle",
    );
  };

  const scheduleDraftSave = (): void => {
    setDraftStatus("Сохраняем черновик…", "saving");
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(saveDraft, autosaveDelay);
  };

  const restoreDraft = (): boolean => {
    const draft = readEditorDraft<Record<string, unknown>>(config.storageKey);
    if (!draft) return false;

    for (const [name, value] of Object.entries(draft)) {
      const field = form.elements.namedItem(name);
      if (
        (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
        typeof value === "string"
      ) {
        field.value = value;
      }
    }

    setDraftStatus("Черновик восстановлен", "restored");
    return true;
  };

  const prompt = chooseMessage(config.promptMessages);
  if (prompt) content.placeholder = prompt;

  const restored = restoreDraft();
  isDirty = restored;
  setButtonState(restored ? "dirty" : "idle");
  resizeTextarea();
  updateCharacterCount();

  form.addEventListener("input", () => {
    isDirty = true;
    setButtonState("dirty");
    resizeTextarea();
    updateCharacterCount();
    scheduleDraftSave();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setButtonState("saving");
    if (message) {
      message.textContent = "";
      message.dataset.tone = "";
    }

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        body: new FormData(form),
      });
      const result = await readEditorResponse(response);

      if (
        handleExpiredEditorSession({
          response,
          result,
          messageElement: message,
          onExpired: () => {
            if (message) message.dataset.tone = "error";
            setButtonState(isDirty ? "dirty" : "idle");
          },
        })
      ) return;

      if (!response.ok || !result.ok || result.id === undefined) {
        throw new Error(result.message || "Не удалось сохранить запись.");
      }

      window.clearTimeout(autosaveTimer);
      clearEditorDraft(config.storageKey);
      isDirty = false;
      setButtonState("saved");

      setDraftStatus("Запись сохранена", "saved");
      if (message) {
        message.dataset.tone = "success";
        message.textContent = chooseMessage(config.successMessages) ?? "Сохранено.";
      }

      window.setAppToastForNextPage?.({
        tone: "success",
        title: config.savedButtonLabel ?? "Сохранено",
        message: "Изменения опубликованы.",
      });
      document.body.classList.add("is-leaving");
      window.setTimeout(() => {
        window.location.href = config.redirectTo(result.id as string | number);
      }, successDelay);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ошибка сохранения";
      if (message) {
        message.dataset.tone = "error";
        message.textContent = errorMessage;
      }
      window.showAppToast?.({
        tone: "error",
        title: "Не удалось сохранить",
        message: errorMessage,
      });
      setButtonState(isDirty ? "dirty" : "idle");
    }
  });
}
