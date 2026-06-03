# Stream Worker Handshake

Detailed message flow between `streamManager.ts` (main thread) and `stream.worker.ts`.

## Diagram

```mermaid
sequenceDiagram
  participant VC as VideoCapture
  participant SM as streamManager
  participant SW as stream.worker.ts
  participant IDB as IndexedDB (Dexie)
  participant API as POST /uploads

  VC->>SM: startStreamUpload(mediaId, ...)
  SM->>SW: START_UPLOAD
  loop until no pending parts
    SW->>IDB: read parts by mediaId (ordered partNumber)
    SW->>SM: REQUEST_SIGNED_URLS(partNumbers)
    SM->>API: POST /uploads/:id/part-urls
    API-->>SM: { urls }
    SM->>SW: SIGNED_URLS_RESPONSE
    SW->>SW: XHR PUT each part to S3
    SW->>IDB: delete uploaded parts
    SW->>SM: PROGRESS_UPDATE
  end
  VC->>SM: notifyRecordingFinished(mediaId)
  SM->>SW: RECORDING_FINISHED
  SW->>SM: UPLOAD_COMPLETE
  SM->>API: POST /uploads/:id/complete
```

## Why main thread calls the API

Web Workers cannot access `localStorage` for the JWT. The worker requests URLs; the manager attaches `Authorization` and calls Axios.

## Failure handling

- XHR upload failures retry within worker logic (see `stream.worker.ts` for per-part retry limits)
- `STOP_UPLOAD` aborts in-flight work
- Manager can `terminate()` worker and clear IndexedDB on user cancel

## Files

| File | Role |
|------|------|
| `lib/uploads/streamManager.ts` | Worker lifecycle, API bridge |
| `lib/uploads/stream.worker.ts` | Upload loop, IndexedDB IO |
| `lib/db.ts` | Dexie schema |
| `components/uploads/VideoCapture.tsx` | MediaRecorder integration |

See also [upload pipeline](./upload-pipeline.md).
