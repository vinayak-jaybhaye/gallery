export default async function downloadMedia(
  url: string,
  title: string,
  id: string,
  sizeBytes?: number
) {
  if (!url) return;

  const LARGE_FILE_THRESHOLD = 30 * 1024 * 1024; // 30MB

  // Large files → stream directly
  if (!sizeBytes || sizeBytes > LARGE_FILE_THRESHOLD) {
    const a = document.createElement("a");
    a.href = url;
    a.download = title || `media-${id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  let objectUrl: string | null = null;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Download request failed with status ${response.status}`);
    }

    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = title || `media-${id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("Download failed", err);
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}