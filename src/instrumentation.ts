let cronTask: import("node-cron").ScheduledTask | null = null;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Block server startup until the expensive product caches are warm.
  // Once this resolves, every user's first page load is served from memory.
  const { warmProductCache } = await import("@/lib/product-cache");
  await warmProductCache().catch(() => {});

  // Schedule automatic pg_dump backups. Fires at the top of every hour,
  // reads the schedule from DB, and runs only when the hour matches.
  const cron = await import("node-cron");
  const { prisma } = await import("@/lib/prisma");
  const { saveBackupToDisk, pruneOldBackups } = await import("@/lib/backup-util");

  if (cronTask) cronTask.stop();

  cronTask = cron.schedule("0 * * * *", async () => {
    try {
      const settings = await prisma.settings.findUnique({ where: { id: "settings" } });
      if (!settings || settings.backupSchedule === "disabled") return;

      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour !== settings.backupScheduleHour) return;

      // weekly = Monday only
      if (settings.backupSchedule === "weekly" && now.getDay() !== 1) return;

      console.log("[backup] Running scheduled pg_dump…");
      const filename = await saveBackupToDisk();
      console.log(`[backup] Saved ${filename}`);

      await pruneOldBackups(settings.backupRetentionDays);
    } catch (err) {
      console.error("[backup] Scheduled backup failed:", err);
    }
  });
}
