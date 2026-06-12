import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { SettingsData } from "../types";

async function fetchSettingsFromDB(): Promise<SettingsData> {
  const settings = await prisma.settings.upsert({
    where: { id: "settings" },
    create: { id: "settings" },
    update: {},
  });
  return {
    ...settings,
    defaultVATRate: settings.defaultVATRate.toString(),
  };
}

export const getSettings = unstable_cache(fetchSettingsFromDB, ["settings-data"], {
  tags: ["settings"],
});
