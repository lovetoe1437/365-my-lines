import { handleExpiredEditorSession } from "./editorRuntime";

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
type OwnerKind = "book" | "diary";
type Placement = "before" | "after";

type EditorImage = {
  key: string;
  id: number | null;
  file: File | null;
  previewUrl: string;
  placement: Placement;
  caption: string;
  deleted: boolean;
};

type ImageApiResult = {
  ok?: boolean;
  message?: string;
  image?: { id?: number; url?: string };
};

export type EntryImageEditor = {
  save(ownerId: number): Promise<void>;
  destroy(): void;
};

async function readResult(response: Response): Promise<ImageApiResult> {
  try {
    return (await response.json()) as ImageApiResult;
  } catch {
    return {};
  }
}

function ensureActiveSession(response: Response, result: ImageApiResult): void {
  if (handleExpiredEditorSession({ response, result })) {
    throw new Error(result.message ?? "Сессия завершилась. Войдите снова.");
  }
}

export function initEntryImageEditor(ownerKind: OwnerKind): EntryImageEditor | null {
  const root = document.querySelector<HTMLElement>("[data-entry-image-editor]");
  const list = root?.querySelector<HTMLElement>("[data-image-list]");
  const input = root?.querySelector<HTMLInputElement>("[data-image-input]");
  const count = root?.querySelector<HTMLElement>("[data-image-count]");
  const empty = root?.querySelector<HTMLElement>("[data-image-empty]");
  const message = root?.querySelector<HTMLElement>("[data-image-message]");
  if (!root || !list || !input) return null;

  const images: EditorImage[] = Array.from(
    list.querySelectorAll<HTMLElement>("[data-image-id]"),
  ).map((element) => ({
    key: `stored-${element.dataset.imageId}`,
    id: Number(element.dataset.imageId),
    file: null,
    previewUrl: element.dataset.imageUrl ?? "",
    placement: element.dataset.imagePlacement === "after" ? "after" : "before",
    caption: element.dataset.imageCaption ?? "",
    deleted: false,
  }));

  const showMessage = (text: string, tone: "error" | "idle" = "idle") => {
    if (!message) return;
    message.textContent = text;
    message.dataset.tone = tone;
  };

  const active = () => images.filter((image) => !image.deleted);

  const move = (image: EditorImage, direction: -1 | 1) => {
    const siblings = active().filter((item) => item.placement === image.placement);
    const index = siblings.indexOf(image);
    const target = siblings[index + direction];
    if (!target) return;
    const first = images.indexOf(image);
    const second = images.indexOf(target);
    [images[first], images[second]] = [images[second], images[first]];
    render();
  };

  const createCard = (image: EditorImage): HTMLElement => {
    const card = document.createElement("article");
    card.className = "entry-images__item";

    const photo = document.createElement("img");
    photo.src = image.previewUrl;
    photo.alt = image.caption;
    card.append(photo);

    const controls = document.createElement("div");
    controls.className = "entry-images__controls";

    const placement = document.createElement("select");
    placement.className = "entry-images__placement";
    placement.ariaLabel = "Положение фотографии";
    for (const [value, label] of [
      ["before", "Перед текстом"],
      ["after", "После текста"],
    ] as const) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = image.placement === value;
      placement.append(option);
    }
    placement.addEventListener("change", () => {
      image.placement = placement.value === "after" ? "after" : "before";
      render();
    });

    const caption = document.createElement("input");
    caption.className = "entry-images__caption";
    caption.type = "text";
    caption.maxLength = 280;
    caption.placeholder = "Подпись — по желанию";
    caption.ariaLabel = "Подпись фотографии";
    caption.value = image.caption;
    caption.addEventListener("input", () => {
      image.caption = caption.value;
    });

    const actions = document.createElement("div");
    actions.className = "entry-images__item-actions";
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "↑";
    up.title = "Переместить выше";
    up.addEventListener("click", () => move(image, -1));
    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "↓";
    down.title = "Переместить ниже";
    down.addEventListener("click", () => move(image, 1));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Убрать";
    remove.className = "entry-images__remove";
    remove.addEventListener("click", () => {
      image.deleted = true;
      if (image.file) URL.revokeObjectURL(image.previewUrl);
      render();
    });
    actions.append(up, down, remove);
    controls.append(placement, caption, actions);
    card.append(controls);
    return card;
  };

  const render = () => {
    list.replaceChildren();
    const visible = active();
    for (const placement of ["before", "after"] as const) {
      const group = visible.filter((image) => image.placement === placement);
      if (!group.length) continue;
      const title = document.createElement("p");
      title.className = "entry-images__group-title";
      title.textContent = placement === "before" ? "Перед текстом" : "После текста";
      list.append(title, ...group.map(createCard));
    }
    if (count) count.textContent = `${visible.length} / ${MAX_IMAGES}`;
    if (empty) empty.hidden = visible.length > 0;
    input.disabled = visible.length >= MAX_IMAGES;
  };

  input.addEventListener("change", () => {
    showMessage("");
    const selected = Array.from(input.files ?? []);
    const remaining = MAX_IMAGES - active().length;
    if (selected.length > remaining) {
      showMessage(`Можно добавить ещё ${remaining} фото.`, "error");
    }
    for (const file of selected.slice(0, remaining)) {
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        showMessage(`«${file.name}» превышает 15 МБ или пуст.`, "error");
        continue;
      }
      images.push({
        key: `new-${crypto.randomUUID()}`,
        id: null,
        file,
        previewUrl: URL.createObjectURL(file),
        placement: "after",
        caption: "",
        deleted: false,
      });
    }
    input.value = "";
    render();
  });

  render();

  return {
    async save(ownerId: number) {
      showMessage("Сохраняем фотографии…");

      for (const image of images.filter((item) => item.deleted && item.id)) {
        const response = await fetch(`/api/images/${image.id}`, { method: "DELETE" });
        const result = await readResult(response);
        ensureActiveSession(response, result);
        if (!response.ok && response.status !== 404) {
          throw new Error(result.message ?? "Не удалось удалить фотографию.");
        }
        image.id = null;
      }

      const visible = active();
      for (const placement of ["before", "after"] as const) {
        const group = visible.filter((image) => image.placement === placement);
        for (const [sortOrder, image] of group.entries()) {
          const data = new FormData();
          data.set("placement", placement);
          data.set("sortOrder", String(sortOrder));
          data.set("caption", image.caption);

          if (image.id) {
            const response = await fetch(`/api/images/${image.id}`, {
              method: "PATCH",
              body: data,
            });
            const result = await readResult(response);
            ensureActiveSession(response, result);
            if (!response.ok || !result.ok) {
              throw new Error(result.message ?? "Не удалось обновить фотографию.");
            }
            continue;
          }

          if (!image.file) continue;
          data.set("ownerKind", ownerKind);
          data.set("ownerId", String(ownerId));
          data.set("image", image.file);
          const response = await fetch("/api/images", { method: "POST", body: data });
          const result = await readResult(response);
          ensureActiveSession(response, result);
          if (!response.ok || !result.ok || !result.image?.id) {
            throw new Error(result.message ?? "Не удалось загрузить фотографию.");
          }
          URL.revokeObjectURL(image.previewUrl);
          image.id = result.image.id;
          image.file = null;
          image.previewUrl = result.image.url ?? `/media/images/${image.id}`;
        }
      }

      showMessage("Фотографии сохранены.");
    },
    destroy() {
      for (const image of images) {
        if (image.file) URL.revokeObjectURL(image.previewUrl);
      }
    },
  };
}
