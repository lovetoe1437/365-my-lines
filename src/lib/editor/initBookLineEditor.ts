interface ApiResult {
  ok?: boolean;
  message?: string;
}

type AppWindow = Window & {
  showAppDialog?: (options: Record<string, string>) => void;
  showAppToast?: (options: Record<string, string>) => void;
  setAppToastForNextPage?: (options: Record<string, string>) => void;
};

export function initBookLineEditor(): void {
  const root = document.querySelector<HTMLElement>("[data-book-line-editor]");
  if (!root) return;

  const id = Number(root.dataset.lineId);
  const readingUrl = root.dataset.readingUrl ?? "/lines";
  if (!Number.isInteger(id) || id <= 0) return;

  const appWindow = window as AppWindow;
  const draftKey = `365-my-lines:edit-book-line-${id}`;
  const form = document.querySelector<HTMLFormElement>("#edit-form");
  const save = document.querySelector<HTMLButtonElement>("#save");
  const message = document.querySelector<HTMLElement>("#message");
  const content = document.querySelector<HTMLTextAreaElement>("#content");
  const title = document.querySelector<HTMLInputElement>("#title");
  const number = document.querySelector<HTMLInputElement>("#number");
  const lineDate = document.querySelector<HTMLInputElement>("#lineDate");
  const status = document.querySelector<HTMLElement>("#draft-status");
  const count = document.querySelector<HTMLElement>("#character-count");
  const dialog = document.querySelector<HTMLDialogElement>("#delete-dialog");
  const openDelete = document.querySelector<HTMLButtonElement>("#open-delete-dialog");
  const cancelDelete = document.querySelector<HTMLButtonElement>("#cancel-delete");
  const confirmDelete = document.querySelector<HTMLButtonElement>("#confirm-delete");
  let saveTimer = 0;

  const handleExpiredSession = (response: Response, result: ApiResult): boolean => {
    if (response.status !== 401) return false;
    if (message) message.textContent = result.message ?? "Сессия завершилась. Войдите снова.";
    appWindow.showAppDialog?.({
      eyebrow: "Доступ к редактору",
      title: "Сессия завершилась",
      message: result.message ?? "Для продолжения необходимо снова войти.",
      actionLabel: "Войти",
      actionHref: "/login",
    });
    return true;
  };

  const updateCount = (): void => {
    if (count && content) count.textContent = String(content.value.length);
  };

  const saveDraft = (): void => {
    if (!title || !content || !number || !lineDate) return;
    localStorage.setItem(draftKey, JSON.stringify({
      title: title.value,
      content: content.value,
      number: number.value,
      lineDate: lineDate.value,
    }));
    if (status) status.textContent = "Черновик сохранён";
  };

  const scheduleDraft = (): void => {
    if (status) status.textContent = "Сохраняем черновик…";
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 500);
  };

  try {
    const stored = localStorage.getItem(draftKey);
    if (stored && title && content && number && lineDate) {
      const draft = JSON.parse(stored) as Partial<Record<"title" | "content" | "number" | "lineDate", string>>;
      title.value = draft.title ?? title.value;
      content.value = draft.content ?? content.value;
      number.value = draft.number ?? number.value;
      lineDate.value = draft.lineDate ?? lineDate.value;
      if (status) status.textContent = "Несохранённый черновик восстановлен";
    }
  } catch {
    localStorage.removeItem(draftKey);
  }

  [title, number, lineDate].forEach((element) => element?.addEventListener("input", scheduleDraft));
  content?.addEventListener("input", () => {
    updateCount();
    scheduleDraft();
  });
  updateCount();

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form || !save) return;

    save.disabled = true;
    save.textContent = "Сохраняем…";

    try {
      const response = await fetch(`/api/lines/${id}`, { method: "PUT", body: new FormData(form) });
      const result = await response.json() as ApiResult;
      if (handleExpiredSession(response, result)) return;
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Не удалось сохранить.");

      localStorage.removeItem(draftKey);
      save.textContent = "Сохранено ✓";
      appWindow.setAppToastForNextPage?.({ tone: "success", title: "Изменения сохранены", message: "Страница обновлена и опубликована." });
      document.body.classList.add("is-leaving");
      window.setTimeout(() => {
        const nextNumber = Number(number?.value);
        location.href = Number.isFinite(nextNumber) ? `/lines/${String(nextNumber).padStart(3, "0")}` : readingUrl;
      }, 400);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ошибка";
      if (message) message.textContent = errorMessage;
      appWindow.showAppToast?.({ tone: "error", title: "Не удалось сохранить", message: errorMessage });
      save.disabled = false;
      save.textContent = "Сохранить изменения";
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
      const response = await fetch(`/api/lines/${id}`, { method: "DELETE" });
      const result = await response.json() as ApiResult;
      if (response.status === 401) {
        appWindow.showAppDialog?.({
          eyebrow: "Доступ к редактору",
          title: "Сессия завершилась",
          message: result.message ?? "Для продолжения необходимо снова войти.",
          actionLabel: "Войти",
          actionHref: "/login",
        });
        return;
      }
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Не удалось удалить строку.");

      localStorage.removeItem(draftKey);
      appWindow.setAppToastForNextPage?.({ tone: "success", title: "Страница удалена", message: "Она больше не отображается в книге." });
      location.href = "/lines";
    } catch (error) {
      const notFound = error instanceof Error && /не существует|не найдена|удалена/i.test(error.message);
      appWindow.showAppDialog?.({
        eyebrow: notFound ? "Страница была удалена" : "Не удалось удалить",
        title: notFound ? "Страница больше не существует" : "Что-то пошло не так",
        message: error instanceof Error ? error.message : "Не удалось удалить строку.",
        actionLabel: notFound ? "Вернуться к книге" : "Закрыть",
        actionHref: notFound ? "/lines" : "",
      });
      confirmDelete.disabled = false;
      confirmDelete.textContent = "Удалить страницу";
    }
  });
}
