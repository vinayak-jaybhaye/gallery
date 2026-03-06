import { create } from "zustand";

export type Media = {
  id: string;
  ownerId?: string;
  type: "image" | "video";
  title: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  takenAt?: string;
  createdAt: string;
  originalUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  updatedAt?: string;
  shareWithMeDate?: string;
};

type QueryState = {
  ids: string[];
  nextCursor?: string;
  hasMore: boolean;
};

type MediaStore = {
  entities: Record<string, Media>;
  queries: Record<string, QueryState>;

  setMedia: (key: string, items: Media[], cursor?: string) => void;
  appendMedia: (key: string, items: Media[], cursor?: string) => void;

  enrichMedia: (detail: Media) => void;
  getMediaById: (id: string) => Media | null;
  getMediaForQuery: (key: string) => Media[];

  deleteMedia: (id: string) => void;
  addMediaAtTop: (key: string, media: Media) => void;

  clearQuery: (key: string) => void;
  clearAll: () => void;
};

export const useMediaStore = create<MediaStore>((set, get) => ({
  entities: {},

  queries: {},

  setMedia: (key, items, cursor) =>
    set((state) => {
      const entities = { ...state.entities };

      items.forEach((item) => {
        entities[item.id] = item;
      });

      return {
        entities,
        queries: {
          ...state.queries,
          [key]: {
            ids: items.map((i) => i.id),
            nextCursor: cursor,
            hasMore: !!cursor,
          },
        },
      };
    }),

  appendMedia: (key, items, cursor) =>
    set((state) => {
      const entities = { ...state.entities };
      const prev = state.queries[key] ?? {
        ids: [],
        hasMore: false,
      };

      items.forEach((item) => {
        entities[item.id] = item;
      });

      const idSet = new Set(prev.ids);

      items.forEach((i) => idSet.add(i.id));

      return {
        entities,
        queries: {
          ...state.queries,
          [key]: {
            ids: Array.from(idSet),
            nextCursor: cursor,
            hasMore: !!cursor,
          },
        },
      };
    }),

  enrichMedia: (detail) =>
    set((state) => ({
      entities: {
        ...state.entities,
        [detail.id]: {
          ...state.entities[detail.id],
          ...detail,
        },
      },
    })),

  getMediaById: (id) => get().entities[id] ?? null,

  getMediaForQuery: (key) => {
    const { entities, queries } = get();
    const query = queries[key];
    if (!query) return [];
    return query.ids.map((id) => entities[id]).filter(Boolean);
  },

  deleteMedia: (id) =>
    set((state) => {
      const entities = { ...state.entities };
      delete entities[id];

      const queries = Object.fromEntries(
        Object.entries(state.queries).map(([k, q]) => [
          k,
          {
            ...q,
            ids: q.ids.filter((i) => i !== id),
          },
        ])
      );

      return { entities, queries };
    }),

  addMediaAtTop: (key, media) =>
    set((state) => {
      const prev = state.queries[key] ?? { ids: [], hasMore: false };

      return {
        entities: {
          ...state.entities,
          [media.id]: media,
        },
        queries: {
          ...state.queries,
          [key]: {
            ...prev,
            ids: [media.id, ...prev.ids.filter((id) => id !== media.id)],
          },
        },
      };
    }),

  clearQuery: (key) =>
    set((state) => ({
      queries: {
        ...state.queries,
        [key]: {
          ids: [],
          nextCursor: undefined,
          hasMore: false,
        },
      },
    })),

  clearAll: () =>
    set({
      entities: {},
      queries: {},
    }),
}));