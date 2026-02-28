import { useRef, useState } from "react";
import { useUpload } from "@/hooks/useUpload";
import CameraCapture from "./CameraCapture";
import VideoCapture from "./VideoCapture";
import { Camera, Files, Video, Plus } from "lucide-react";

export default function UploadFAB() {
  const { uploadFile, loading, error } = useUpload();

  const [open, setOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [streamOn, setStreamOn] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadFile(file);
    setOpen(false);
  }

  function handleCapture(blob: Blob) {
    const file = new File(
      [blob],
      `photo-${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );

    uploadFile(file);
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">

        {open && (
          <div className="flex flex-col items-end gap-3 mb-3">

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white shadow-lg px-4 py-2 rounded-full text-sm"
            >
              <Files className="w-4 h-4 inline mr-2" />
              Browse Storage
            </button>

            <button
              onClick={() => {
                setCameraOpen(true);
                setOpen(false);
              }}
              className="bg-white shadow-lg px-4 py-2 rounded-full text-sm"
            >
              <Camera className="w-4 h-4 inline mr-2" />
              Take Photo
            </button>

            {/* Video streaming will be separate later */}
            <button
              onClick={() => {
                setStreamOn(true);
                setOpen(false);
              }}
              className="bg-white shadow-lg px-4 py-2 rounded-full text-sm"
            >
              <Video className="w-4 h-4 inline mr-2" />
              Record Video
            </button>
          </div>
        )}

        <button
          onClick={() => setOpen((prev) => !prev)}
          disabled={loading}
          className="w-14 h-14 rounded-full bg-blue-600 text-white text-3xl shadow-xl flex items-center justify-center hover:bg-blue-700 transition"
        >
          <Plus className="w-6 h-6" />
        </button>

        {loading && (
          <p className="text-white text-xs mt-2 text-right">
            Uploading...
          </p>
        )}

        {error && (
          <p className="text-red-500 text-xs mt-2 text-right">
            {error}
          </p>
        )}
      </div>

      {/* Hidden Browse Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Real Camera Modal */}
      {cameraOpen && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* Video stream */}
      {streamOn && (
        <VideoCapture
          onClose={() => setStreamOn(false)}
        />
      )}
    </>
  );
}