## 1.0.1 — Дата последней записи

- Главная страница определяет последнюю запись по авторской дате страницы книги или дневника.
- В строке «Последнее обновление» отображается дата самой записи, а не техническое время её сохранения или редактирования.
- Визуальная концепция и остальные пользовательские сценарии не изменены.

## 2.2.3 — TASK-A4.4: стабильная прокрутка длинного текста

- Поля длинного текста в редакторах книги и дневника получили собственную вертикальную прокрутку.
- Убрано динамическое увеличение высоты textarea, из-за которого страница прыгала при наборе внизу длинной записи.
- Курсор теперь остаётся внутри стабильной области редактирования, а нижние метаданные и кнопки не уезжают дальше по странице.
- Черновики, счётчик символов, сохранение, удаление и API не изменены.

## 2.2.2 — TASK-A4.3

- Extracted the book editor form into `BookLineEditorForm.astro`.
- Reused shared `EditorMeta` and `EditorActions` components.
- Kept the existing design, DOM IDs, API calls, and client behavior unchanged.
- Simplified the book edit route to data loading and composition.

## [2.2.1] — TASK-A4.2: прокрутка редактора и ритм чтения дневника

- В длинных дневниковых записях поле текста теперь имеет собственную вертикальную прокрутку.
- Нижние метаданные и кнопки больше не уезжают бесконечно вниз при наборе большого текста.
- Уменьшен размер текста на странице чтения дневника.
- Сокращены чрезмерные интервалы между строками, чтобы стихи и короткие записи читались спокойнее.
- Дизайн, API и логика сохранения не изменены.

# Changelog

## [2.2.0] — TASK-A4.1: клиентская логика редактора книги

- Клиентская логика редактора книги вынесена из `src/pages/lines/[id]/edit.astro` в `src/lib/editor/initBookLineEditor.ts`.
- Страница редактора стала короче и теперь отвечает преимущественно за данные, разметку и стили.
- Сохранены автосохранение черновика, счётчик символов, изменение высоты textarea, сохранение, удаление, уведомления и переходы.
- Добавлен документ `docs/TASK-A4.md` с этапами дальнейшего рефакторинга.
- Внешний вид и API не изменялись.

## [2.1.8] — TASK-A2: общая навигация чтения

- Добавлен общий компонент `src/components/reading/ReadingNavigation.astro`.
- Навигация книги и дневника вынесена из крупных страниц чтения.
- Сохранены прежние ссылки, подписи, клавиатурное и свайп-поведение.
- Стили навигации перенесены вместе с компонентом без визуальных изменений.

## [2.1.7] — 2026-07-23

### Architecture — TASK-A1

- Верхняя панель чтения книги вынесена в `BookReadingToolbar.astro`.
- Верхняя панель записи дневника вынесена в `DiaryReadingHeader.astro`.
- Стили компонентов перенесены вместе с разметкой без изменения внешнего вида.
- Маршруты, подписи, aria-атрибуты и мобильное поведение сохранены.

## 2.1.6 — Architecture completion audit

- Проведён полный аудит структуры проекта версии 2.1.5.
- Зафиксированы шесть конкретных задач до архитектуры 100%.
- Определены главные зоны технического долга: две reading-страницы и редактор книги.
- Добавлен `docs/ARCHITECTURE_AUDIT_2_1_5.md` с Definition of Done.
- Дизайн официально остаётся замороженным: дальнейшие изменения не должны менять внешний вид.

## [2.1.5] - Context-aware 404 client fix

- Исправлено определение раздела на 404-странице в dev/server-режиме Astro.
- Контекст теперь определяется по реальному `window.location.pathname`, поскольку серверная 404 могла видеть только `/404`.
- Ошибочные адреса дневника ведут в `/book`, а ошибочные адреса книги — в `/lines`.

## 2.1.4 — Context-aware 404 navigation

- Исправлена навигация на странице 404: недоступные страницы дневника теперь предлагают открыть дневник, а страницы книги — открыть книгу.
- Контекст определяется по текущему URL (`/pages/*`, `/diary/*` или `/book` для дневника; остальные адреса используют книгу по умолчанию).
- Внешний вид страницы 404 не изменён.

## 2.1.3 — Surface and Typography Pilot

- Страница 404 переведена на Foundation-компоненты `Paper`, `Eyebrow`, `Heading` и `Text`.
- Сохранены исходные HTML-семантика, размеры, отступы, цвета и адаптивность.
- Зафиксирован безопасный паттерн `:global(...)` для scoped CSS при использовании дочерних Astro-компонентов.
- Добавлена документация `docs/SURFACE_MIGRATION_2_1_3.md`.
- Остальные страницы и пользовательские сценарии не изменялись.

# Changelog

## 2.1.2 — Scoped Style Compatibility Fix

### Fixed
- Reverted the unsafe page-wrapper migration that caused Astro scoped page styles to stop matching rendered elements.
- Restored the original native page structure and the `main.app-shell` layout wrapper.
- Preserved all Foundation System components for gradual migration using scoped-style-safe patterns.
- Restored the approved visual layout without changing page content or behavior.

## 2.1.0 — Foundation System

### Added
- Layout primitives: `Container`, `Section`, `Stack`, and `Cluster`.
- Surface primitives: `Paper`, `Card`, and `Divider`.
- Typography primitives: `Heading`, `Text`, `Eyebrow`, and `Quote`.
- Shared foundation styles and component documentation.

### Changed
- Global styles now load the reusable foundation layer.
- Package version updated to 2.1.0.

## 1.9.0 — Reading Experience: typography and mobile polish

- narrowed the reading measure to a comfortable character-based width;
- improved paragraph rhythm, wrapping, widows and orphans;
- tuned short and long entry typography independently;
- improved mobile readability and the sticky page-turner surface;
- prevented horizontal page swipes from triggering when a gesture starts on an interactive control.

## 1.8.1 — Final Toast fix

- Исправлен конфликт scoped-стилей Astro с элементами Toast, создаваемыми через JavaScript.
- Все стили уведомления переведены в контролируемую глобальную область компонента.
- SVG-иконки теперь создаются безопасно через DOM API и всегда имеют фиксированный размер.
- Добавлены дополнительные ограничения размеров, корректная анимация и доступные состояния фокуса.
- Сохранён утверждённый дизайн на компьютере и мобильных устройствах.

## 1.8.0 — Toast visual polish

- Redesigned toast notifications into a compact, balanced card.
- Replaced text symbols with consistent SVG icons.
- Increased the close target and aligned it with the notification content.
- Improved spacing, shadows, borders and mobile safe-area placement.
- Kept existing success, warning, error, info and action behavior unchanged.

## 1.7.9 — 2026-07-22

- Добавлена единая фирменная система Toast-уведомлений.
- Успешное создание, редактирование и удаление книги и дневника подтверждается ненавязчивым уведомлением после перехода.
- Сохранение страницы Unspoken использует то же уведомление.
- Ошибки сохранения показываются и в форме, и в Toast, не теряя введённый текст.
- Toast адаптирован для компьютера и телефона и учитывает `prefers-reduced-motion`.
- Критические сценарии, требующие действия пользователя, по-прежнему используют `AppDialog`.

## 1.7.8 — 2026-07-22

- Уточнены тексты фирменных диалогов для уже удалённых страниц.
- В дневнике теперь используется подпись «Запись была удалена».
- В книге теперь используется подпись «Страница была удалена».
- Подтверждено, что все сообщения проекта используют единый компонент `AppDialog`; системных `alert()`, `confirm()` и `prompt()` в исходном коде нет.

## 1.7.7 — 2026-07-22

- Добавлено единое фирменное окно сообщений в стиле проекта.
- Системные `alert()` при удалении страниц заменены красивыми диалогами.
- Для удалённой в другой вкладке записи показывается понятное окно с переходом к дневнику или книге.
- Сообщения об истёкшей сессии и проблемах соединения также оформлены в стиле проекта.

# Changelog

## 1.7.6 — корректный ответ для отсутствующих записей

- Обновление и удаление записей дневника теперь проверяют, была ли реально изменена строка в D1.
- Обновление и удаление страниц книги используют такую же проверку.
- При повторном удалении или сохранении уже удалённой записи API возвращает `404`, а не ложный успешный ответ.
- Редактор и окно удаления показывают понятное сообщение, не перенаправляя пользователя как после успешной операции.

## 1.7.5 — корректное завершение сессии

- Защищённые API-маршруты теперь возвращают JSON с кодом `401`, а не HTML-перенаправление.
- Редакторы книги, дневника и страницы «Невысказанное» распознают завершившуюся сессию.
- Локальный черновик сохраняется, после чего пользователь перенаправляется на страницу входа.
- Удаление записей также показывает понятное сообщение при завершившейся сессии.


## 1.7.3 — Diary navigation label

- Исправлена подпись верхней ссылки на странице записи дневника.
- Теперь она показывает «Вернуться в дневник» и по-прежнему ведёт на страницу дневника.
- Логика книги и Unspoken не изменялась.

## 1.7.2 — Context-aware Unspoken navigation

- Unspoken now remembers whether it was opened from the book or diary.
- Book links use `?from=book` and return to the last written book page.
- Diary links use `?from=diary` and return to the diary.
- Direct links keep a sensible fallback based on the selected visibility mode.

## 1.7.0 — Editable Unspoken

- Добавлен редактор `/unspoken/edit`.
- Текст Unspoken хранится в D1 и меняется без нового деплоя.
- Добавлены три режима: скрытая, эпилог книги, отдельная ссылка.
- Добавлено локальное автосохранение черновика редактора.
- Добавлена миграция `0005_create_unspoken_settings.sql`.

## 1.6.0 — Unspoken

- Добавлена скрытая страница `/unspoken`.
- Страница оформлена как отдельный лист книги без навигации.
- Добавлены адаптивная типографика, бумажная фактура и плавное появление текста.
- Текст страницы вынесен в `src/content/unspoken.ts` для удобного редактирования.
- Страница исключена из индексации поисковиками.

Все заметные изменения проекта фиксируются в этом файле.

## [2.1.1] — 2026-07-22

### Foundation Migration — Layout

- Начат перевод существующих страниц на компонент `Section` без изменения утверждённого дизайна.
- Исправлена семантика основного содержимого: `AppLayout` больше не создаёт общий `<main>`, поэтому страницы могут иметь собственный единственный main-landmark.
- Главная, оглавление, чтение строки, вход, 404 и редактор Unspoken используют единый layout-примитив.
- Добавлен отчёт миграции `docs/design-system/migration-2.1.1.md`.
- Версия проекта обновлена до `2.1.1`.

## [1.1.1] — 2026-07-22

### Foundation Polish

- Вынесено определение состояния и видимости навигации в `src/lib/ui/navigation.ts`.
- Добавлен единый форматтер русских дат в `src/lib/ui/date.ts`.
- Страницы книги, дневника и редакторов переведены на общую утилиту дат.
- Цвета, границы и тени поверхности чтения вынесены в дизайн-токены.
- Добавлена документация: `VISION.md`, `ARCHITECTURE.md`, `UI_GUIDELINES.md`, `ROADMAP.md`.
- Внешний вид и пользовательские сценарии сохранены без функциональных изменений.

## [1.1.0]

### Book Polish

- Добавлены общие дизайн-токены и переходы.
- Улучшены состояния кнопок, ссылок, книги и дневника.
- Добавлены мягкие анимации появления страниц.

## [1.4.0] — 2026-07-22

### Table of Contents

#### Добавлено

- Новое книжное оглавление для раздела «Книга».
- Единая композиция для десктопной и мобильной версий.
- Естественная книжная нумерация без ведущих нулей: `1`, `2`, `3`.
- Мягкие анимации появления строк оглавления.
- Короткое состояние «Открываем страницу…» перед переходом к чтению.

#### Улучшено

- Убрана визуальная перегруженность прежнего списка.
- Заголовок, даты, разделители и стрелки приведены к языку печатного издания.
- Hover-состояния стали спокойнее и ближе к странице настоящей книги.

#### Итог

Оглавление стало полноценной входной страницей цифровой книги и визуально продолжает завершённый Reading Experience.

## 2026-07-22 — Home composition matched to approved sketch
- Rebalanced desktop hero proportions and book size.
- Moved the botanical branch forward and outside the book silhouette so it remains visible.
- Preserved the approved mobile ordering and strengthened botanical visibility.
- Softened book shadows and tightened hero spacing to match the approved desktop/mobile concept.

## 1.5.0 — Release metadata

- Added complete SEO metadata, canonical URLs and robots directives.
- Added Open Graph and Twitter large-image cards.
- Added a 1200×630 social preview image.
- Added web app icons, Apple touch icon and web manifest.
- Added dynamic `robots.txt` and `sitemap.xml` routes.
- Prevented editor, login and API pages from being indexed.

## 1.7.1

- Эпилог в оглавлении оформлен как полноценная строка книги.
- Последняя страница книги ведёт в Unspoken, когда включён режим эпилога.
- При выключенном эпилоге навигация по-прежнему ведёт к оглавлению.
- На странице Unspoken ссылка назад возвращает к последней написанной странице книги.

## 1.7.4 — Correct latest-entry links and styled 404

- Fixed the homepage latest-book-entry link to open the real database record route (`/lines/d-{id}`), avoiding collisions between a database ID and the visible book page number.
- Added a custom 404 page in the visual style of the project.
- Missing book, diary and editor records now use the custom error page with links to the homepage and the book.

## 2.0.1 — Design Foundation

- Расширена единая система дизайн-токенов: семантические цвета, состояния, типографика, spacing, радиусы, тени, motion, focus и z-index.
- Сохранены совместимые алиасы для безопасной поэтапной миграции существующих страниц.
- Компонент `Button` получил варианты primary, secondary, ghost, danger и link, три размера, loading, disabled и icon-only состояния.
- Удалена глобальная трансформация всех ссылок и кнопок при нажатии: микровзаимодействия теперь принадлежат компонентам.
- Добавлен единый focus-паттерн.
- Создана документация `docs/design-system/`.

## Architecture review — 2026-07-23

- Проведён полный аудит baseline 2.1.2.
- Зафиксированы риски scoped CSS и массовой миграции компонентов.
- Выбран безопасный пилот Typography Migration на странице 404.
- Добавлен документ `docs/ARCHITECTURE_REVIEW_2_1_2.md`.

## 2.1.9 — Book reading layout hotfix

- Restored the book reading composition styles accidentally removed during TASK-A2.
- Restored the intended narrow prose column, left-aligned body text, heading spacing, ornaments, and responsive typography.
- Kept the shared `ReadingNavigation` component and its navigation behavior unchanged.
# Подготовка к 1.0 — 2026-07-23

- Исправлены критические сценарии создания, редактирования и удаления страниц.
- Стабилизирована работа редакторов после завершения авторской сессии.
- Даты редакторов переведены на локальный календарный день.
- Улучшена доступность редакторов, навигации и диалогов.
- Шрифты подключены локально без изменения книжной типографики.
- Общая логика редакторов вынесена в `src/lib/editor`.
- Добавлена безопасная работа с ответами API, черновиками и ограниченным `localStorage`.
- Устранено дублирование идентификатора индикатора черновика.
- Добавлены автоматические тесты критической логики редакторов.
## 1.0.0 — Первый законченный выпуск

- Завершена полировка цифровой книги без изменения утверждённой визуальной концепции.
- Проверены мобильная и настольная композиции главной, книги, дневника, редакторов, Unspoken и 404.
- Исправлены критические маршруты, серверная валидация и сохранение авторской сессии.
- Стабилизированы создание, автосохранение, редактирование и удаление страниц.
- Сохранены пользовательские переносы строк для стихотворного и прозаического текста.
- Шрифты переведены на локальную загрузку.
- Улучшена клавиатурная доступность, навигация и работа диалогов.
- Добавлены автоматические тесты критической логики редакторов и сессии.
- Проверены Cloudflare D1, KV, production-секреты и удалённые миграции.
