import { create } from "zustand";

export type Media = {
  id: string;
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
};

type QueryKey = "all" | "videos" | "images";

type QueryState = {
  ids: string[];
  nextCursor?: string;
  hasMore?: boolean;
};

type MediaStore = {
  entities: Record<string, Media>;
  queries: Record<QueryKey, QueryState>;

  setMedia: (key: QueryKey, items: Media[], cursor?: string) => void;
  appendMedia: (key: QueryKey, items: Media[], cursor?: string) => void;

  enrichMedia: (detail: Media) => void;
  getMediaById: (id: string) => Media | null;
  getMediaForQuery: (key: QueryKey) => Media[];

  deleteMedia: (id: string) => void;
  addMediaAtTop: (key: QueryKey, media: Media) => void;

  clearQuery: (key: QueryKey) => void;
  clearAll: () => void;
};

export const useMediaStore = create<MediaStore>((set, get) => ({
  entities: {},

  queries: {
    all: { ids: [] },
    videos: { ids: [] },
    images: { ids: [] },
  },

  // Replace entire list
  setMedia: (key, items, cursor) =>
    set((state) => {
      const newEntities = { ...state.entities };

      items.forEach((item) => {
        newEntities[item.id] = item;
      });

      return {
        entities: newEntities,
        queries: {
          ...state.queries,
          [key]: {
            ids: items.map((i) => i.id),
            nextCursor: cursor,
          },
        },
      };
    }),

  // Append paginated results
  appendMedia: (key, items, cursor) =>
    set((state) => {
      const newEntities = { ...state.entities };
      const existingIds = state.queries[key].ids;

      items.forEach((item) => {
        newEntities[item.id] = item;
      });

      const newIds = items
        .map((i) => i.id)
        .filter((id) => !existingIds.includes(id));

      return {
        entities: newEntities,
        queries: {
          ...state.queries,
          [key]: {
            ids: [...existingIds, ...newIds],
            nextCursor: cursor,
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
    return queries[key].ids.map((id) => entities[id]).filter(Boolean);
  },

  deleteMedia: (id) =>
    set((state) => {
      const newEntities = { ...state.entities };
      delete newEntities[id];

      const newQueries = Object.fromEntries(
        Object.entries(state.queries).map(([key, query]) => [
          key,
          {
            ...query,
            ids: query.ids.filter((i) => i !== id),
          },
        ])
      ) as Record<QueryKey, QueryState>;

      return {
        entities: newEntities,
        queries: newQueries,
      };
    }),

  addMediaAtTop: (key, media) =>
    set((state) => ({
      entities: {
        ...state.entities,
        [media.id]: media,
      },
      queries: {
        ...state.queries,
        [key]: {
          ...state.queries[key],
          ids: [media.id, ...state.queries[key].ids],
        },
      },
    })),

  clearQuery: (key) =>
    set((state) => ({
      queries: {
        ...state.queries,
        [key]: { ids: [] },
      },
    })),

  clearAll: () =>
    set({
      entities: {},
      queries: {
        all: { ids: [] },
        videos: { ids: [] },
        images: { ids: [] },
      },
    }),
}));