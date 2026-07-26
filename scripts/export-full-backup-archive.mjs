import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_R2_BACKUP_TOKEN;
const backupBucket = process.env.R2_BACKUP_BUCKET ?? "365-my-lines-backups";
const backupDirectory = resolve("backups");
const archiveDirectory = resolve("full-backups", "snapshot");

if (!accountId || !token) {
  console.error("Для архива нужны CLOUDFLARE_ACCOUNT_ID и CLOUDFLARE_R2_BACKUP_TOKEN.");
  process.exit(1);
}

function objectPath(key = "") {
  const encodedKey = key
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const suffix = encodedKey ? `/objects/${encodedKey}` : "/objects";
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${encodeURIComponent(backupBucket)}${suffix}`;
}

async function apiJson(url) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.errors?.map((error) => error.message).join("; ") || `Cloudflare API: ${response.status}`);
  }
  return payload;
}

async function listObjects(prefix) {
  const objects = [];
  let cursor = null;
  do {
    const url = new URL(objectPath());
    url.searchParams.set("prefix", prefix);
    if (cursor) url.searchParams.set("cursor", cursor);
    const payload = await apiJson(url);
    const page = payload.result?.objects ?? payload.result ?? [];
    if (!Array.isArray(page)) throw new Error("Cloudflare вернул неожиданный список резервных объектов.");
    objects.push(...page);
    cursor = payload.result?.cursor ?? payload.result_info?.cursor ?? null;
  } while (cursor);
  return objects;
}

async function downloadObject(key) {
  const response = await fetch(objectPath(key), { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Не удалось скачать ${key}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function latestDatabaseBackup() {
  const backups = readdirSync(backupDirectory).filter((file) => file.endsWith(".sql")).sort();
  const latest = backups.at(-1);
  if (!latest) throw new Error("Не найден свежий экспорт D1 в папке backups.");
  return resolve(backupDirectory, latest);
}

function destinationForImage(key) {
  if (!key.startsWith("entries/") || key.includes("..")) {
    throw new Error("Манифест содержит некорректный ключ фотографии.");
  }
  const imageRoot = resolve(archiveDirectory, "images");
  const destination = resolve(imageRoot, key);
  if (relative(imageRoot, destination).startsWith("..")) {
    throw new Error("Путь фотографии выходит за пределы архива.");
  }
  mkdirSync(dirname(destination), { recursive: true });
  return destination;
}

try {
  rmSync(archiveDirectory, { recursive: true, force: true });
  mkdirSync(archiveDirectory, { recursive: true });

  const snapshots = await listObjects("snapshots/");
  const latestSnapshot = snapshots
    .map((object) => object.key)
    .filter((key) => typeof key === "string" && key.endsWith(".json"))
    .sort()
    .at(-1);
  if (!latestSnapshot) throw new Error("Не найден манифест свежего полного снимка.");

  const manifest = JSON.parse(new TextDecoder().decode(await downloadObject(latestSnapshot)));
  if (!Array.isArray(manifest.imageKeys)) throw new Error("Манифест снимка не содержит список фотографий.");

  const databasePath = latestDatabaseBackup();
  copyFileSync(databasePath, resolve(archiveDirectory, "database.sql"));
  writeFileSync(resolve(archiveDirectory, "manifest.json"), JSON.stringify({
    ...manifest,
    archivedAt: new Date().toISOString(),
    sourceDatabaseFile: basename(databasePath),
    sourceSnapshot: latestSnapshot,
  }, null, 2));

  for (const key of manifest.imageKeys) {
    writeFileSync(destinationForImage(key), await downloadObject(`images/${key}`));
  }

  console.log(`Архив подготовлен: ${manifest.imageKeys.length} фотографий и база D1.`);
} catch (error) {
  console.error(`Не удалось подготовить скачиваемый архив: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
