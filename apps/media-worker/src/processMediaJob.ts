import { prisma } from "./lib/prisma";
import { processMedia } from "./processMedia";

export async function runMediaProcessingJob(mediaId: string): Promise<void> {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });

  if (!media || media.status !== "processing") {
    return;
  }

  await processMedia(media);
}
