const encoder = new TextEncoder();

/**
 * Безопасно сравнивает введённый пароль с ADMIN_PASSWORD.
 *
 * Оба значения сначала преобразуются в SHA-256,
 * поэтому сравниваемые массивы всегда имеют одинаковую длину.
 */
export async function verifyPassword(
  enteredPassword: string,
  adminPassword: string
): Promise<boolean> {
  if (!enteredPassword || !adminPassword) {
    return false;
  }

  const [enteredHash, adminHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(enteredPassword)),
    crypto.subtle.digest('SHA-256', encoder.encode(adminPassword))
  ]);

  return crypto.subtle.timingSafeEqual(enteredHash, adminHash);
}
