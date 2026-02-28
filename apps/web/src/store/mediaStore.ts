import { create } from "zustand";

export type Media = {
  id: string;
  type: "image" | "video";
  title: string;

  // Grid fields
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  takenAt?: string;
  createdAt: string;

  // Detail fields (optional)
  originalUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  updatedAt?: string;
};

type MediaStore = {
  items: Media[];
  nextCursor?: string;

  setMedia: (items: Media[], cursor?: string) => void;
  appendMedia: (items: Media[], cursor?: string) => void;

  enrichMedia: (detail: Media) => void;
  getMediaById: (id: string) => Media | null;

  deleteMedia: (id: string) => void;
  addMediaAtTop: (media: Media) => void;

  clear: () => void;
};

export const useMediaStore = create<MediaStore>((set, get) => ({
  items: [],
  nextCursor: undefined,

  // Replace entire list (initial load)
  setMedia: (items, cursor) =>
    set({ items, nextCursor: cursor }),

  // Append paginated results
  appendMedia: (newItems, cursor) =>
    set((state) => ({
      items: [...state.items, ...newItems],
      nextCursor: cursor,
    })),

  // Enrich existing media with detail fields
  enrichMedia: (detail) =>
    set((state) => {
      const index = state.items.findIndex(
        (m) => m.id === detail.id
      );

      if (index === -1) return state;

      const updated = [...state.items];
      updated[index] = {
        ...updated[index],
        ...detail,
      };

      return { items: updated };
    }),

  // Get media by id
  getMediaById: (id) => {
    const item = get().items.find((m) => m.id === id);
    return item ?? null;
  },

  // Delete media
  deleteMedia: (id) =>
    set((state) => ({
      items: state.items.filter((m) => m.id !== id),
    })),

  // Add new upload at top
  addMediaAtTop: (media) =>
    set((state) => ({
      items: [media, ...state.items],
    })),

  clear: () =>
    set({
      items: [],
      nextCursor: undefined,
    }),
}));