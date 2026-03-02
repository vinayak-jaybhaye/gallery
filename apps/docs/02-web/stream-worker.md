┌─────────────────────────────────────────────────────────────────────────┐
│                           MAIN THREAD                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  StreamManager / UploadManager                                    │  │
│  │                                                                   │  │
│  │  1. Receives "REQUEST_SIGNED_URLS" from worker                   │  │
│  │  2. Calls API: getPartUploadUrls(mediaId, partNumbers)           │  │
│  │  3. Sends "SIGNED_URLS_RESPONSE" back to worker                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ postMessage
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           WEB WORKER                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  stream.worker.ts                                                 │  │
│  │                                                                   │  │
│  │  1. processLoop() gets parts from IndexedDB                       │  │
│  │  2. Sends "REQUEST_SIGNED_URLS" to main thread                   │  │
│  │  3. waitForSignedUrls() creates Promise + sets signedUrlResolver │  │
│  │  4. handleSignedUrls() resolves the Promise when response arrives│  │
│  │  5. uploadBatch() runs after Promise resolves                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘