import { readdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_R2_BACKUP_TOKEN;
const sourceBucket = process.env.R2_SOURCE_BUCKET ?? "365-my-lines-images";
const backupBucket = process.env.R2_BACKUP_BUCKET ?? "365-my-lines-backups";
const backupDirectory = resolve("backups");

if (!accountId || !token) {
  console.error("Для резервной копии R2 нужны CLOUDFLARE_ACCOUNT_ID и CLOUDFLARE_R2_BACKUP_TOKEN.");
  process.exit(1);
}

function objectPath(bucket, key = "") {
  const encodedKey = key
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const suffix = encodedKey ? `/objects/${encodedKey}` : "/objects";
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}${suffix}`;
}

async function apiJson(url) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.errors?.map((error) => error.message).join("; ") || `Cloudflare API: ${response.status}`);
  }
  return payload;
}

async function listObjects() {
  const objects = [];
  let cursor = null;
  do {
    const url = new URL(objectPath(sourceBucket));
    url.searchParams.set("prefix", "entries/");
    if (cursor) url.searchParams.set("cursor", cursor);
    const payload = await apiJson(url);
    const page = payload.result?.objects ?? payload.result ?? [];
    if (!Array.isArray(page)) throw new Error("Cloudflare вернул неожиданный список объектов R2.");
    objects.push(...page);
    cursor = payload.result?.cursor ?? payload.result_info?.cursor ?? null;
  } while (cursor);
  return objects;
}

async function copyObject(object) {
  if (!object?.key || !object.key.startsWith("entries/")) {
    throw new Error("В списке R2 найден некорректный ключ фотографии.");
  }

  const source = await fetch(objectPath(sourceBucket, object.key), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!source.ok || !source.body) throw new Error(`Не удалось прочитать ${object.key}: ${source.status}`);

  const headers = { Authorization: `Bearer ${token}` };
  const contentType = object.http_metadata?.contentType;
  if (contentType) headers["Content-Type"] = contentType;

  const target = await fetch(objectPath(backupBucket, `images/${object.key}`), {
    method: "PUT",
    headers,
    body: source.body,
    duplex: "half",
  });
  const payload = await target.json().catch(() => null);
  if (!target.ok || !payload?.success) {
    throw new Error(payload?.errors?.map((error) => error.message).join("; ") || `Не удалось сохранить ${object.key}: ${target.status}`);
  }
}

async function uploadObject(key, body, contentType) {
  const response = await fetch(objectPath(backupBucket, key), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.errors?.map((error) => error.message).join("; ") || `Не удалось сохранить ${key}: ${response.status}`);
  }
}

function latestDatabaseBackup() {
  const backups = readdirSync(backupDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const latest = backups.at(-1);
  if (!latest) throw new Error("Не найден свежий экспорт D1 в папке backups.");
  return resolve(backupDirectory, latest);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const databasePath = latestDatabaseBackup();
const databaseKey = `database/${basename(databasePath)}`;

try {
  const objects = await listObjects();
  for (const object of objects) await copyObject(object);

  await uploadObject(databaseKey, readFileSync(databasePath), "application/sql");
  const manifestKey = `snapshots/${timestamp}.json`;
  await uploadObject(manifestKey, JSON.stringify({
    createdAt: new Date().toISOString(),
    databaseKey,
    imagePrefix: "images/entries/",
    imageCount: objects.length,
    imageKeys: objects.map((object) => object.key),
  }, null, 2), "application/json");

  console.log(`Сохранено фотографий: ${objects.length}`);
  console.log(`Экспорт базы: ${databaseKey}`);
  console.log(`Манифест снимка: ${manifestKey}`);
} catch (error) {
  console.error(`Резервная копия R2 не завершена: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
