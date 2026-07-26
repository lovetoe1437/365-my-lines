import type { APIContext } from "astro";

const ADMIN_SESSION_KEY = "admin";
const READER_SESSION_KEY = "reader";

export async function createReaderSession(context: APIContext): Promise<void> {
  await context.session?.regenerate();
  context.session?.set(READER_SESSION_KEY, true);
}

export async function createAdminSession(context: APIContext): Promise<void> {
  await context.session?.regenerate();
  context.session?.set(ADMIN_SESSION_KEY, true);
  context.session?.set(READER_SESSION_KEY, true);
}

export async function isAdmin(context: APIContext): Promise<boolean> {
  const value = await context.session?.get(ADMIN_SESSION_KEY);

  return value === true;
}

export async function isReader(context: APIContext): Promise<boolean> {
  const [reader, admin] = await Promise.all([
    context.session?.get(READER_SESSION_KEY),
    context.session?.get(ADMIN_SESSION_KEY),
  ]);

  return reader === true || admin === true;
}

export function destroyAdminSession(context: APIContext): void {
  context.session?.destroy();
}
