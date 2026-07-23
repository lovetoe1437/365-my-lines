import { mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const databaseName = "365-my-lines-db";
const backupDirectory = resolve("backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = resolve(backupDirectory, `${databaseName}-${timestamp}.sql`);
const wranglerCli = resolve("node_modules", "wrangler", "bin", "wrangler.js");

mkdirSync(backupDirectory, { recursive: true });

const result = spawnSync(
  process.execPath,
  [
    wranglerCli,
    "d1",
    "export",
    databaseName,
    "--remote",
    "--output",
    outputPath,
    "--skip-confirmation",
  ],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(`Не удалось запустить Wrangler: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const backupSize = statSync(outputPath).size;
if (backupSize === 0) {
  console.error("Экспорт завершился пустым файлом.");
  process.exit(1);
}

console.log(`Резервная копия создана: ${outputPath}`);
console.log(`Размер: ${backupSize} байт`);
