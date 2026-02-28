import { Request, Response } from "express";
import {
  startUploadService,
  completeUploadService,
  getPartUploadUrlsService,
  abortUploadService,
  getUploadStatusService,
  listUploadSessionsService
} from "./uploads.service";

export async function startUpload(req: Request, res: Response) {
  const result = await startUploadService({
    userId: req.user!.id,
    ...req.body,
  });

  res.json(result);
}

export async function completeUpload(req: Request<{ id: string }>, res: Response) {
  const result = await completeUploadService({
    userId: req.user!.id,
    mediaId: req.params.id,
  });

  res.json(result);
}

export async function getPartUploadUrls(req: Request<{ id: string }>, res: Response) {
  const result = await getPartUploadUrlsService({
    userId: req.user!.id,
    mediaId: req.params.id,
    partNumbers: req.body.partNumbers
  })

  res.json(result);
}

export async function abortUpload(req: Request<{ id: string }>, res: Response) {
  const result = await abortUploadService({
    userId: req.user!.id,
    mediaId: req.params.id
  });

  res.json(result);
}

export async function getUploadStatus(req: Request<{ id: string }>, res: Response) {
  const result = await getUploadStatusService({
    userId: req.user!.id,
    mediaId: req.params.id
  });

  res.json(result);
}

export async function listActiveUploads(req: Request, res: Response) {
  const result = await listUploadSessionsService({
    userId: req.user!.id
  });

  res.json(result);
}