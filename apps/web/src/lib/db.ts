import Dexie, { type Table } from "dexie";

export interface Part {
  id?: number;
  userId: string;
  mediaId: string;
  partNumber: number;
  blob: Blob;
  createdAt: number;
}

class VideoDB extends Dexie {
  parts!: Table<Part>;

  constructor() {
    super("VideoUploader");

    this.version(2).stores({
      parts: `
        ++id,
        mediaId,
        createdAt,
        [mediaId+partNumber]
      `,
    });
  }
}

export const db = new VideoDB();