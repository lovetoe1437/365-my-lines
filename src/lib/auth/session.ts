import type { APIContext } from "astro";

const SESSION_KEY = "admin";

export function createAdminSession(context: APIContext): void {
  context.session?.regenerate();
  context.session?.set(SESSION_KEY, true);
}

export async function isAdmin(context: APIContext): Promise<boolean> {
  const value = await context.session?.get(SESSION_KEY);

  return value === true;
}

export function destroyAdminSession(context: APIContext): void {
  context.session?.destroy();
}
