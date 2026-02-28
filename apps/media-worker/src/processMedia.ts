import { processImage } from "./processors/image.processor";
import { processVideo } from "./processors/video.processor";

export async function processMedia(media: any) {
  console.log("Processing:", media.id);

  try {
    switch (media.type) {
      case "image":
        await processImage(media);
        break;

      case "video":
        await processVideo(media);
        break;

      default:
        throw new Error(`Unsupported media type: ${media.type}`);
    }

    console.log("Done:", media.id);
  } catch (err) {
    console.error("Processing failed:", err);
  }
}