import { create } from "zustand";
import type { PendingUploadItem } from "@/api/upload";

export type UploadItem = {
  mediaId: string;
  title: string;
  type: "image" | "video";
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  createdAt: string;
  uploadedBytes: number;
  status: "pending" | "uploading" | "failed";
};

export type UploadState = {
  uploads: Record<string, UploadItem>;
  hasBootstrapped: boolean;
  bootstrapUploads: (uploads: PendingUploadItem[]) => void;

  updateProgress: (mediaId: string, uploadedBytes: number) => void;
  setStatus: (mediaId: string, status: UploadItem["status"]) => void;
  removeUpload: (mediaId: string) => void;
  addUpload: (item: UploadItem) => void;
};

export const useUploadStore = create<UploadState>((set) => ({
  uploads: {},
  hasBootstrapped: false,
  updateProgress: (mediaId, uploadedBytes) => {
    set((state) => {
      const existing = state.uploads[mediaId];
      if (!existing) return state;

      return {
        uploads: {
          ...state.uploads,
          [mediaId]: {
            ...existing,
            uploadedBytes,
          },
        },
      };
    });
  },

  setStatus: (mediaId, status) => {
    set((state) => {
      const existing = state.uploads[mediaId];
      if (!existing) return state;

      return {
        uploads: {
          ...state.uploads,
          [mediaId]: {
            ...existing,
            status,
          },
        },
      };
    });
  },

  removeUpload: (mediaId) => {
    set((state) => {
      const newUploads = { ...state.uploads };
      delete newUploads[mediaId];
      return { uploads: newUploads };
    });
  },

  addUpload: (item) => {
    set((state) => ({
      uploads: {
        ...state.uploads,
        [item.mediaId]: item,
      },
    }));
  },

  // merge uploads with locally managed uploads, enrich state and update hasBootstapped
  bootstrapUploads: (uploads) => {
    console.log("Bootstrapping uploads:", uploads)
    set((state) => {
      const newUploads = { ...state.uploads };

      uploads.forEach((item) => {
        const existing = newUploads[item.mediaId];

        if (existing) {
          // Merge backend metadata but keep local progress + status
          newUploads[item.mediaId] = {
            ...item,
            uploadedBytes: existing.uploadedBytes,
            status: existing.status,
          };
        } else {
          // New upload from backend
          newUploads[item.mediaId] = {
            ...item,
            uploadedBytes: 0,
            status: "pending",
          };
        }
      });

      return {
        uploads: newUploads,
        hasBootstrapped: true,
      };
    });
  },

}));