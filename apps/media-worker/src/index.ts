import "dotenv/config";
import { prisma } from "./lib/prisma";
import { processMedia } from "./processMedia";

async function startWorker() {
  console.log("Media worker started...");

  while (true) {
    const pending = await prisma.media.findMany({
      where: { status: "processing" },
      take: 5,
    });

    console.log("Found pending media:", pending.length);

    if (pending.length === 0) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    for (const media of pending) {
      try {
        await processMedia(media);
      } catch (err) {
        console.error("Failed processing:", media.id, err);
      }
    }
  }
}

startWorker();