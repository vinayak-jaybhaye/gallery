import { create } from "zustand";
import type { MediaType } from "@/api/media";
import type { AlbumListItem } from "@/api/albums";

export type Album = AlbumListItem;

/*
AlbumListItem = {
  id: string;
  title: string;
  createdAt: Date;
  count: number;
  coverMediaUrl: string | null;
  ownerId: string;
  userRole: "owner" | "viewer" | "editor";
}
*/

type AlbumQueryState = {
  ids: string[];
  nextCursor?: string | null;
  hasMore: boolean;
};

type AlbumMediaQueryState = {
  ids: string[];
  nextCursor?: string;
  hasMore: boolean;
};

function albumMediaKey(albumId: string, mediaType?: MediaType) {
  return `${albumId}:${mediaType ?? "all"}`;
}

export type AlbumStore = {
  // Normalized album entities
  entities: Record<string, Album>;

  // Multiple query buckets
  queries: {
    all: AlbumQueryState;
    search: Record<string, AlbumQueryState>; // searchTerm - state
  };

  // Album -> media query buckets (IDs only; media entities live in `mediaStore`)
  mediaQueries: Record<string, AlbumMediaQueryState>;

  // Actions
  setAlbums: (items: Album[], nextCursor?: string | null) => void;
  appendAlbums: (items: Album[], nextCursor?: string | null) => void;
  setSearchResults: (search: string, items: Album[], nextCursor?: string | null) => void;
  appendSearchResults: (search: string, items: Album[], nextCursor?: string | null) => void;
  enrichAlbum: (album: Album) => void;
  getAlbumById: (id: string) => Album | null;

  setAlbumMedia: (albumId: string, items: { id: string }[], nextCursor?: string, mediaType?: MediaType) => void;
  appendAlbumMedia: (albumId: string, items: { id: string }[], nextCursor?: string, mediaType?: MediaType) => void;
  getAlbumMediaIds: (albumId: string, mediaType?: MediaType) => string[];
  clearAlbumMedia: (albumId: string, mediaType?: MediaType) => void;

  clear: () => void;
};

export const useAlbumStore = create<AlbumStore>((set, get) => ({
  entities: {},

  queries: {
    all: {
      ids: [],
      nextCursor: undefined,
      hasMore: false,
    },
    search: {},
  },

  mediaQueries: {},

  // Set fresh album list
  setAlbums: (items, nextCursor) =>
    set((state) => {
      const entities = { ...state.entities };
      items.forEach((a) => (entities[a.id] = a));

      return {
        entities,
        queries: {
          ...state.queries,
          all: {
            ids: items.map((a) => a.id),
            nextCursor,
            hasMore: !!nextCursor,
          },
        },
      };
    }),

  // Append pagination
  appendAlbums: (items, nextCursor) =>
    set((state) => {
      const entities = { ...state.entities };
      items.forEach((a) => (entities[a.id] = a));

      const prev = state.queries.all;

      return {
        entities,
        queries: {
          ...state.queries,
          all: {
            ids: Array.from(
              new Set([...prev.ids, ...items.map((a) => a.id)])
            ),
            nextCursor,
            hasMore: !!nextCursor,
          },
        },
      };
    }),

  // Search result set
  setSearchResults: (search, items, nextCursor) =>
    set((state) => {
      const entities = { ...state.entities };
      items.forEach((a) => (entities[a.id] = a));

      return {
        entities,
        queries: {
          ...state.queries,
          search: {
            ...state.queries.search,
            [search]: {
              ids: items.map((a) => a.id),
              nextCursor,
              hasMore: !!nextCursor,
            },
          },
        },
      };
    }),

  appendSearchResults: (search, items, nextCursor) =>
    set((state) => {
      const entities = { ...state.entities };
      items.forEach((a) => (entities[a.id] = a));

      const prev = state.queries.search[search] ?? {
        ids: [],
        hasMore: false,
      };

      return {
        entities,
        queries: {
          ...state.queries,
          search: {
            ...state.queries.search,
            [search]: {
              ids: Array.from(
                new Set([...prev.ids, ...items.map((a) => a.id)])
              ),
              nextCursor,
              hasMore: !!nextCursor,
            },
          },
        },
      };
    }),

  enrichAlbum: (album) =>
    set((state) => ({
      entities: { ...state.entities, [album.id]: album },
    })),

  getAlbumById: (id) => get().entities[id] || null,

  setAlbumMedia: (albumId, items, nextCursor, mediaType) =>
    set((state) => {
      const key = albumMediaKey(albumId, mediaType);
      return {
        mediaQueries: {
          ...state.mediaQueries,
          [key]: {
            ids: items.map((i) => i.id),
            nextCursor,
            hasMore: !!nextCursor,
          },
        },
      };
    }),

  appendAlbumMedia: (albumId, items, nextCursor, mediaType) =>
    set((state) => {
      const key = albumMediaKey(albumId, mediaType);
      const prev = state.mediaQueries[key] ?? { ids: [], hasMore: false };
      const nextIds = Array.from(new Set([...prev.ids, ...items.map((i) => i.id)]));

      return {
        mediaQueries: {
          ...state.mediaQueries,
          [key]: {
            ids: nextIds,
            nextCursor,
            hasMore: !!nextCursor,
          },
        },
      };
    }),

  getAlbumMediaIds: (albumId, mediaType) => {
    const key = albumMediaKey(albumId, mediaType);
    return get().mediaQueries[key]?.ids ?? [];
  },

  clearAlbumMedia: (albumId, mediaType) =>
    set((state) => {
      const key = albumMediaKey(albumId, mediaType);
      const next = { ...state.mediaQueries };
      delete next[key];
      return { mediaQueries: next };
    }),

  clear: () =>
    set({
      entities: {},
      queries: {
        all: { ids: [], nextCursor: undefined, hasMore: false },
        search: {},
      },
      mediaQueries: {},
    }),
}));