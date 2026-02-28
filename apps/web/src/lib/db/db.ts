import Dexie from "dexie";
import type { Table } from "dexie";

export interface Part {
  id?: number;
  mediaId: string;
  partNumber: number;
  blob: Blob;
  uploaded: boolean;
  etag?: string;
  retries: 0
}

class VideoDB extends Dexie {
  parts!: Table<Part>;

  constructor() {
    super("VideoUploader");
    this.version(1).stores({
      parts: "++id, mediaId, partNumber, uploaded, retries",
    });
  }
}

export const db = new VideoDB();