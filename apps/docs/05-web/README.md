# Web Application

**Path:** `apps/web`  
**Stack:** React 19, React Router 7, Vite 7, Zustand, Axios, Tailwind CSS 4, Dexie (IndexedDB)

## Entry

| File | Role |
|------|------|
| `src/main.tsx` | Mount app, router |
| `src/App.tsx` | Router provider |
| `src/app/router.tsx` | Route definitions |
| `index.html` | Loads Google GSI script + Vite bundle |

## Environment

Vite reads from **monorepo root** (`vite.config.ts` → `envDir: ../..`):

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Axios base (default `http://localhost:3000`) |
| `VITE_GOOGLE_CLIENT_ID` | Google Sign-In (`Login.tsx`) |

## Routing

Defined in `src/app/router.tsx`.

| Path | Component | Auth |
|------|-----------|------|
| `/` | Redirect → `/gallery` | — |
| `/login` | `Login` | Public |
| `/gallery`, `/images`, `/videos`, `/favorites` | `Gallery` (+ optional `:mediaId`) | Protected |
| `/uploads` | `Uploads` | Protected |
| `/trash` | `Trash` | Protected |
| `/albums` | `Albums` | Protected |
| `/albums/:albumId` | `AlbumDetails` (+ optional `:mediaId`) | Protected |
| `/shared` | `SharedWithMe` | Protected |
| `/my-shares` | `MyShares` | Protected |
| `/accountandsettings` | `AccountAndSettings` | Protected |
| `/public/:token` | `MediaViewer` | Public |
| `*` | `NotFound` | Protected wrapper |

`ProtectedRoute` redirects unauthenticated users to `/login`.

### Gallery path behavior

`/gallery`, `/images`, `/videos` share `Gallery.tsx`:

- `/images` → API list filter `type=image`
- `/videos` → `type=video`
- `/gallery` → no type filter

`/favorites` uses the same `Gallery` component **without** a favorites API filter — there is no favorites backend (see [known gaps](../01-overview/system-architecture.md#known-gaps)).

## Layout

`AppLayout` (`components/layout/AppLayout.tsx`):

- `Navbar`, `Sidebar`, main outlet
- Upload FAB / modals
- Search query context for library views

## State (Zustand)

| Store | File | Purpose |
|-------|------|---------|
| `useAuthStore` | `store/authStore.ts` | User session; `localStorage` `accessToken` + `user` |
| `useMediaStore` | `store/mediaStore.ts` | Media entities, cursor caches, list mutations |
| `useAlbumStore` | `store/albumStore.ts` | Album list/detail state |
| `useUploadStore` | `store/uploadStore.ts` | In-progress upload UI state |

## API client

`src/lib/axios.ts`:

- `baseURL` from `VITE_API_URL`
- Request interceptor adds `Authorization: Bearer` from `localStorage.accessToken`
- Response interceptor normalizes error messages via `getErrorMessage`

API modules: `src/api/auth.ts`, `media.ts`, `upload.ts`, `albums.ts`, `user.ts`

## Authentication UX

`Login.tsx`:

1. Loads Google Identity Services (`accounts.google.com/gsi/client`)
2. Initializes button with `VITE_GOOGLE_CLIENT_ID`
3. On credential → `POST /auth/google` → `authStore.login`
4. Email/password form → `POST /auth/credentials-login`

Polls/waits for `window.google` before rendering button (async script).

## Key pages

| Page | Responsibility |
|------|----------------|
| `Gallery` | Tabbed library, selection, trash/delete, album add |
| `MediaViewer` | Lightbox, metadata, share UI |
| `Uploads` | Active/historical upload progress |
| `Trash` | Soft-deleted media |
| `Albums` / `AlbumDetails` | Album CRUD and media membership |
| `SharedWithMe` / `MyShares` | Share management |
| `AccountAndSettings` | Profile, password auth |

## Components (selected)

```text
components/
  gallery/MediaGrid.tsx      Infinite scroll grid
  media/MediaCard.tsx        Thumbnail card
  media/ShareModal.tsx       Direct + public sharing
  uploads/Upload.tsx         File picker upload entry
  uploads/VideoCapture.tsx   MediaRecorder → stream upload
  albums/AlbumGrid.tsx       Album listing
  layout/Sidebar.tsx         Navigation
```

## Related

- [Upload pipeline](./upload-pipeline.md)
- [Stream worker handshake](./stream-worker.md)
- [API routes](../04-api/README.md)
