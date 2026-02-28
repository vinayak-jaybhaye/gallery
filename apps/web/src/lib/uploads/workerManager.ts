let worker: Worker | null = null;

export function getUploadWorker() {
  if (!worker) {
    worker = new Worker(
      new URL("./stream.worker.ts", import.meta.url),
      { type: "module" }
    );

    const token = localStorage.getItem("accessToken");

    worker.postMessage({
      type: "SET_AUTH",
      token
    });

    console.log("[UploadManager] Worker created");
  }

  return worker;
}