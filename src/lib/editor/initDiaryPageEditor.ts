import {
  clearEditorDraft,
  handleExpiredEditorSession,
  readEditorDraft,
  readEditorResponse,
  writeEditorDraft,
} from "./editorRuntime";

export function initDiaryPageEditor(): void {
  const root = document.querySelector<HTMLElement>("[data-diary-page-editor]");
  if (!root) return;

  const id = Number(root.dataset.pageId);
  if (!Number.isInteger(id) || id <= 0) return;

  const draftKey = `365-my-lines:edit-diary-page-${id}`;
  const form = document.querySelector<HTMLFormElement>("#edit-form");
  const titleInput = document.querySelector<HTMLInputElement>("#title");
  const contentInput = document.querySelector<HTMLTextAreaElement>("#content");
  const dateInput = document.querySelector<HTMLInputElement>("#entryDate");
  const saveButton = document.querySelector<HTMLButtonElement>("#save-button");
  const message = document.querySelector<HTMLElement>("#form-message");
  const status = document.querySelector<HTMLElement>("#draft-status");
  const count = document.querySelector<HTMLElement>("#character-count");
  const dialog = document.querySelector<HTMLDialogElement>("#delete-dialog");
  const openDelete = document.querySelector<HTMLButtonElement>("#open-delete-dialog");
  const cancelDelete = document.querySelector<HTMLButtonElement>("#cancel-delete");
  const confirmDelete = document.querySelector<HTMLButtonElement>("#confirm-delete");
  let saveTimer = 0;

  const updateCount = (): void => {
    if (count && contentInput) count.textContent = String(contentInput.value.length);
  };

  const setDraftStatus = (
    text: string,
    state: "idle" | "saving" | "saved" | "restored",
  ): void => {
    if (!status) return;
    status.textContent = text;
    status.dataset.state = state;
  };

  const saveDraft = (): void => {
    if (!titleInput || !contentInput || !dateInput) return;

    const saved = writeEditorDraft(draftKey, {
      title: titleInput.value,
      content: contentInput.value,
      entryDate: dateInput.value,
    });
    setDraftStatus(
      saved ? "Черновик сохранён" : "Черновик недоступен",
      saved ? "saved" : "idle",
    );
  };

  const scheduleDraft = (): void => {
    setDraftStatus("Сохраняем черновик…", "saving");
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 500);
  };

  const draft = readEditorDraft<
    Partial<Record<"title" | "content" | "entryDate", string>>
  >(draftKey);
  if (draft && titleInput && contentInput && dateInput) {
    if (
      draft.title !== titleInput.value ||
      draft.content !== contentInput.value ||
      draft.entryDate !== dateInput.value
    ) {
      titleInput.value = draft.title ?? titleInput.value;
      contentInput.value = draft.content ?? contentInput.value;
      dateInput.value = draft.entryDate ?? dateInput.value;
      setDraftStatus("Несохранённый черновик восстановлен", "restored");
    }
  }

  titleInput?.addEventListener("input", scheduleDraft);
  dateInput?.addEventListener("input", scheduleDraft);
  contentInput?.addEventListener("input", () => {
    updateCount();
    scheduleDraft();
  });
  updateCount();

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!titleInput || !contentInput || !dateInput || !saveButton) return;

    if (!titleInput.value.trim() || !contentInput.value.trim() || !dateInput.value) {
      if (message) message.textContent = "Дата, название и текст страницы не могут быть пустыми.";
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Сохраняем…";

    try {
      const data = new FormData();
      data.set("title", titleInput.value);
      data.set("content", contentInput.value);
      data.set("entryDate", dateInput.value);

      const response = await fetch(`/api/pages/${id}`, {
        method: "PUT",
        body: data,
      });
      const result = await readEditorResponse(response);

      if (
        handleExpiredEditorSession({
          response,
          result,
          messageElement: message,
          onExpired: () => {
            saveButton.disabled = false;
            saveButton.textContent = "Сохранить изменения";
          },
        })
      ) return;
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Не удалось сохранить изменения.");
      }

      clearEditorDraft(draftKey);
      saveButton.textContent = "Сохранено ✓";
      setDraftStatus("Изменения сохранены", "saved");
      window.setAppToastForNextPage?.({
        tone: "success",
        title: "Изменения сохранены",
        message: "Запись обновлена и опубликована.",
      });
      document.body.classList.add("is-leaving");
      window.setTimeout(() => {
        window.location.href = `/pages/${id}`;
      }, 400);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Не удалось сохранить изменения.";
      if (message) message.textContent = errorMessage;
      window.showAppToast?.({
        tone: "error",
        title: "Не удалось сохранить",
        message: errorMessage,
      });
      saveButton.disabled = false;
      saveButton.textContent = "Сохранить изменения";
    }
  });

  openDelete?.addEventListener("click", () => dialog?.showModal());
  cancelDelete?.addEventListener("click", () => dialog?.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  confirmDelete?.addEventListener("click", async () => {
    confirmDelete.disabled = true;
    confirmDelete.textContent = "Удаляем…";

    try {
      const response = await fetch(`/api/pages/${id}`, { method: "DELETE" });
      const result = await readEditorResponse(response);

      if (
        handleExpiredEditorSession({
          response,
          result,
          dialog,
          onExpired: () => {
            confirmDelete.disabled = false;
            confirmDelete.textContent = "Удалить запись";
          },
        })
      ) return;

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Не удалось удалить страницу.");
      }

      clearEditorDraft(draftKey);
      window.setAppToastForNextPage?.({
        tone: "success",
        title: "Запись удалена",
        message: "Она больше не отображается в дневнике.",
      });
      window.location.href = "/book";
    } catch (error) {
      const notFound =
        error instanceof Error && /не существует|не найдена|удалена/i.test(error.message);
      window.showAppDialog?.({
        eyebrow: notFound ? "Запись была удалена" : "Не удалось удалить",
        title: notFound ? "Запись больше не существует" : "Что-то пошло не так",
        message: error instanceof Error ? error.message : "Не удалось удалить страницу.",
        actionLabel: notFound ? "Вернуться в дневник" : "Закрыть",
        actionHref: notFound ? "/book" : "",
      });
      confirmDelete.disabled = false;
      confirmDelete.textContent = "Удалить запись";
    }
  });
}
