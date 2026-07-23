export interface NavigationState {
  isBookActive: boolean;
  isDiaryActive: boolean;
  isBookEditor: boolean;
  isDiaryEditor: boolean;
  createHref: "/lines/write" | "/diary/write";
  createLabel: "Новая строка" | "Новая запись";
}

const matchesPath = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

export const getNavigationState = (pathname: string): NavigationState => {
  const isBookActive = pathname === "/" || matchesPath(pathname, "/lines");
  const isDiaryActive = matchesPath(pathname, "/book") || matchesPath(pathname, "/pages") || matchesPath(pathname, "/diary");
  const isBookEditor = pathname === "/lines/write" || /^\/lines\/d-\d+\/edit\/?$/.test(pathname);
  const isDiaryEditor = pathname === "/diary/write" || /^\/pages\/\d+\/edit\/?$/.test(pathname);

  return {
    isBookActive,
    isDiaryActive,
    isBookEditor,
    isDiaryEditor,
    createHref: isDiaryActive ? "/diary/write" : "/lines/write",
    createLabel: isDiaryActive ? "Новая запись" : "Новая строка",
  };
};

export const shouldShowNavigation = (pathname: string) =>
  pathname === "/" ||
  matchesPath(pathname, "/book") ||
  matchesPath(pathname, "/write") ||
  matchesPath(pathname, "/diary") ||
  matchesPath(pathname, "/pages") ||
  matchesPath(pathname, "/lines");
