import { api } from "@/lib/axios";

export type StartUploadResponse = {
  uploadType: "single" | "multipart";
  mediaId: string;
  partSize?: number;
  uploadUrl?: string;
};

export type PartUrl = {
  partNumber: number;
  url: string;
};

export type GetPartUrlsResponse = {
  urls: PartUrl[];
};

export type CompleteUploadPayload = {
  parts: {
    partNumber: number;
    etag: string;
  }[];
};

export type PendingUploadItem = {
  mediaId: string;
  title: string;
  type: "image" | "video";
  mimeType: string;
  sizeBytes: number;
  expiresAt: string;
  createdAt: string;
};

export type PendingUploadsResponse = PendingUploadItem[];

export async function getPendingUploads() {
  const res = await api.get<PendingUploadsResponse>("/uploads");
  return res.data;
}

export async function startUpload(data: {
  type: "image" | "video";
  mimeType: string;
  sizeBytes?: number;
  title: string;
}) {
  const res = await api.post<StartUploadResponse>("/uploads", data);
  console.log("startUpload response:", res.data);
  return res.data;
}

export async function getPartUploadUrls(
  mediaId: string,
  partNumbers: number[]
) {
  try {
    const res = await api.post(
      `/uploads/${mediaId}/part-urls`,
      { partNumbers }
    );

    return res.data;

  } catch (err) {
    throw err;
  }
}

export async function completeUpload(
  mediaId: string,
) {
  const res = await api.post(
    `/uploads/${mediaId}/complete`
  );

  return res.data;
}

export async function abortUpload(mediaId: string) {
  const res = await api.delete(`/uploads/${mediaId}`);
  return res.data;
}

export async function getUploadStatus(mediaId: string) {
  const res = await api.get(`/uploads/${mediaId}/status`);
  return res.data;
}