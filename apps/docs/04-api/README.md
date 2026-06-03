# API Service

**Path:** `apps/api`  
**Stack:** Express 5, TypeScript, Zod, JWT, Prisma, AWS SDK

## Entry points

| File | Role |
|------|------|
| `src/server.ts` | Connect DB, verify S3 (`ListBucketsCommand`), listen on `PORT` |
| `src/app.ts` | Express app, middleware, route mounting |

## Middleware order (`app.ts`)

1. `cors({ origin: FRONTEND_URL, credentials: true })`
2. `express.json()`
3. Route handlers
4. 404 → `AppError` "Route not found"
5. `errorMiddleware`

## Authentication

### Public routes

- `POST /auth/google`
- `POST /auth/credentials-login`
- `GET /health`
- `GET /public/:token`

### Protected routes

`authMiddleware` on:

- `/uploads/*`
- `/media/*`
- `/user/*`
- `/albums/*`

Plus `GET /auth/me` (middleware on route definition in `auth.routes.ts`).

JWT payload shape (signed in `auth.service.ts`):

```json
{ "userId": "<uuid>", "email": "<string>", "avatarUrl": "<string|null>" }
```

`req.user` in handlers: `{ id: userId, email }`.

### Google login (`POST /auth/google`)

Body: `{ idToken: string }`

1. Verify ID token with `google-auth-library` (`GOOGLE_CLIENT_ID`)
2. Upsert `User` by email; update `avatarUrl` from Google picture
3. Return `{ accessToken, user: { id, email, avatarUrl } }`

### Credentials login (`POST /auth/credentials-login`)

Body: `{ email, password }`

**Development shortcut:** If `NODE_ENV === "development"` and `DEV_USER_EMAIL` is set, ignores submitted email/password, upserts that user, and returns a token.

**Production path:** Loads user by email; requires `passwordAuthEnabled` and `passwordHash`; verifies with bcrypt.

## Validation

`validate(schema)` middleware (`middlewares/validate.middleware.ts`) runs Zod schemas shaped as:

```typescript
{ body?, query?, params? }
```

Invalid input → `AppError` 400.

## Error responses

`errorMiddleware` returns:

```json
{ "success": false, "message": "<string>" }
```

Operational errors (`AppError`) expose `message` in development and production. Non-operational 500s hide details outside development.

## Module layout

```text
src/modules/
  auth/       Login, me
  uploads/    Presigned upload lifecycle
  media/      Library, trash, sharing, public links
  albums/     Albums, membership, album shares
  user/       Account info, password auth toggle
src/middlewares/
src/utils/     asyncHandler, paginationCursor
src/lib/       prisma, s3 singletons
```

## Route reference

Base URL: `http://localhost:3000` (default).

### Auth — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/google` | No | Google ID token login |
| POST | `/credentials-login` | No | Email/password login |
| GET | `/me` | Yes | Current user from JWT |

### Uploads — `/uploads`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Start upload; create `Media` (`uploading`) |
| GET | `/` | List active uploads for user |
| POST | `/:id/part-urls` | Presigned URLs for part numbers |
| POST | `/:id/complete` | Finish upload → `processing` + enqueue job |
| GET | `/:id/status` | Resume support (uploaded parts) |
| DELETE | `/:id` | Abort multipart + cleanup |

**Start upload body** (Zod): `type`, `mimeType`, `sizeBytes`, `title`, `source` (`file` | `streaming`)

**Upload mode selection** (`uploads.service.ts`):

- **Single:** `sizeBytes ≤ 10MB` and `source !== "streaming"` → presigned PUT to `original` key
- **Multipart:** larger files or `source === "streaming"` → S3 multipart + `UploadSession` (5MB parts, 3-day expiry)

### Media — `/media`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Library list (`type`, `albumId`, cursor, limit) |
| DELETE | `/` | Soft-delete media IDs (trash) |
| GET | `/:mediaId` | Media details |
| PATCH | `/:mediaId` | Update title / metadata |
| GET | `/trash` | Trashed items |
| DELETE | `/trash` | Permanent delete from trash |
| DELETE | `/trash/all` | Empty trash |
| POST | `/trash/restore` | Restore from trash |
| GET | `/shares/received` | Media shared with me |
| GET | `/shares/sent` | Media I shared |
| GET | `/shares/public` | My public links (owned) |
| GET | `/:mediaId/shares` | Recipients for a media item |
| POST | `/:mediaId/shares` | Share to user |
| DELETE | `/:mediaId/shares/:targetUserId` | Remove share |
| GET | `/:mediaId/shares/public` | Public links for one media |
| POST | `/:mediaId/shares/public` | Create public link |
| DELETE | `/shares/public` | Revoke public links (body: ids) |

List endpoints use cursor pagination (`cursor`, `limit` max 100).

### Albums — `/albums`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create album |
| GET | `/` | List albums |
| GET | `/:albumId` | Album detail |
| PATCH | `/:albumId` | Update album |
| DELETE | `/:albumId` | Delete album |
| POST | `/:albumId/media` | Add media to album |
| DELETE | `/:albumId/media` | Remove media from album |
| GET | `/:albumId/shares` | List collaborators |
| POST | `/:albumId/shares` | Share album to user + role |
| PATCH | `/:albumId/shares/:targetUserId` | Update role |
| DELETE | `/:albumId/shares/:targetUserId` | Remove collaborator |
| POST | `/:albumId/leave` | Leave shared album |

Roles: `viewer`, `editor` (enum `AlbumRole`).

### User — `/user`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Account info (quota, usage, auth flags) |
| POST | `/update-password-auth-state` | Enable/disable password login |

### Public — `/public`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:token` | Resolve `PublicShare` token → media payload for viewer |

## Pagination

`encodeTimeIdCursor` / `decodeTimeIdCursor` (`utils/paginationCursor.ts`):

- Payload JSON `{ t: ISO8601, i: uuid }` → base64url
- Queries use `(time DESC, id DESC)` tie-break pattern

## Startup checks

`server.ts` fails fast if:

- `prisma.$connect()` fails
- `s3Client.send(ListBucketsCommand)` fails

## Related

- [Upload pipeline (web)](../05-web/upload-pipeline.md)
- [Queue package](../03-packages/queue.md)
- [Data model](../07-data-model/schema.md)
