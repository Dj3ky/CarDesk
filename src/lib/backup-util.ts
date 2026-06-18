import { spawn } from "child_process";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";

export type BackupEntry = {
  filename: string;
  size: number;
  createdAt: Date;
};

function getBackupDir(): string {
  const dir = process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export async function listBackups(): Promise<BackupEntry[]> {
  const dir = getBackupDir();
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const dumps = files.filter((f) => f.endsWith(".dump"));
  const entries = await Promise.all(
    dumps.map(async (filename) => {
      const s = await stat(path.join(dir, filename));
      return { filename, size: s.size, createdAt: s.birthtime };
    })
  );
  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function backupFilePath(filename: string): string | null {
  // Prevent path traversal
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return null;
  if (!filename.endsWith(".dump")) return null;
  const dir = getBackupDir();
  const full = path.join(dir, filename);
  if (!existsSync(full)) return null;
  return full;
}

export async function deleteBackup(filename: string): Promise<boolean> {
  const full = backupFilePath(filename);
  if (!full) return false;
  await unlink(full);
  return true;
}

export async function saveBackupToDisk(): Promise<string> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not configured");

  const url = new URL(dbUrl);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const filename = `cardesk-pgdump-${timestamp}.dump`;
  const dir = getBackupDir();
  const filePath = path.join(dir, filename);

  await new Promise<void>((resolve, reject) => {
    const pgdump = spawn(
      "pg_dump",
      [
        "--host", url.hostname,
        "--port", url.port || "5432",
        "--username", url.username,
        "--dbname", url.pathname.replace(/^\//, ""),
        "--format", "custom",
        "--no-password",
      ],
      { env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) } }
    );

    const out = createWriteStream(filePath);
    pgdump.stdout.pipe(out);

    const stderrChunks: Buffer[] = [];
    pgdump.stderr.on("data", (c: Buffer) => stderrChunks.push(c));

    pgdump.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`pg_dump exited ${code}: ${Buffer.concat(stderrChunks).toString()}`));
      } else {
        resolve();
      }
    });
    out.on("error", reject);
  });

  return filename;
}

export async function pruneOldBackups(retentionDays: number): Promise<void> {
  if (retentionDays <= 0) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const entries = await listBackups();
  await Promise.all(
    entries
      .filter((e) => e.createdAt.getTime() < cutoff)
      .map((e) => deleteBackup(e.filename))
  );
}
