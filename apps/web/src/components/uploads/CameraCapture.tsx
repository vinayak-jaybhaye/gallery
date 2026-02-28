import { useEffect, useRef, useState } from "react";

type Props = {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
};

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera not supported on this browser");
        setIsLoading(false);
        return;
      }

      try {
        // Try with ideal constraints first, fallback to basic if needed
        let stream: MediaStream;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920, max: 4096 },
              height: { ideal: 1080, max: 2160 },
            },
            audio: false,
          });
        } catch {
          // Fallback to basic constraints if ideal fails
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
        }

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          // Wait for video to be ready
          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current!;
            video.onloadedmetadata = () => {
              video.play()
                .then(() => resolve())
                .catch(reject);
            };
            video.onerror = () => reject(new Error("Video failed to load"));
          });
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (err) {
        if (!mounted) return;

        console.error("Camera error:", err);

        if (err instanceof Error) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("Camera permission denied. Please allow camera access.");
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setError("No camera found on this device.");
          } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            setError("Camera is in use by another application.");
          } else if (err.name === "OverconstrainedError") {
            setError("Camera doesn't support the requested settings.");
          } else {
            setError(`Camera error: ${err.message}`);
          }
        } else {
          setError("Failed to access camera. Please try again.");
        }

        setIsLoading(false);
      }
    }

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function capture() {
    if (isCapturing) return;

    const stream = streamRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!stream || !video || !canvas) return;

    setIsCapturing(true);

    try {
      const track = stream.getVideoTracks()[0];

      // Try ImageCapture API (Chrome/Edge on desktop, some Android browsers)
      // Note: Not supported on Safari/iOS
      if ("ImageCapture" in window && typeof (window as any).ImageCapture === "function") {
        try {
          const imageCapture = new (window as any).ImageCapture(track);

          // Check if takePhoto is supported
          if (typeof imageCapture.takePhoto === "function") {
            const blob = await imageCapture.takePhoto();
            onCapture(blob);
            onClose();
            return;
          }
        } catch (err) {
          console.warn("ImageCapture failed, falling back to canvas", err);
        }
      }

      // Fallback to canvas capture (works on all browsers)
      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          video.onloadeddata = () => resolve();
          // Timeout fallback
          setTimeout(resolve, 1000);
        });
      }

      const width = video.videoWidth || video.clientWidth;
      const height = video.videoHeight || video.clientHeight;

      if (width === 0 || height === 0) {
        throw new Error("Video dimensions not available");
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      ctx.drawImage(video, 0, 0, width, height);

      // Use a promise-based approach for toBlob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });

      if (!blob) {
        throw new Error("Failed to create image");
      }

      onCapture(blob);
      onClose();
    } catch (err) {
      console.error("Capture error:", err);
      setError(err instanceof Error ? err.message : "Failed to capture photo");
      setIsCapturing(false);
    }
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 p-4">
        <div className="text-white text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="bg-white text-black px-6 py-2 rounded-full"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white">Starting camera...</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`max-h-[75vh] rounded-lg ${isLoading ? "opacity-0" : "opacity-100"}`}
      />

      <div className="flex gap-6 mt-6">
        <button
          onClick={capture}
          disabled={isLoading || isCapturing}
          className="bg-white px-6 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCapturing ? "Capturing..." : "Capture"}
        </button>

        <button
          onClick={onClose}
          className="text-white"
        >
          Cancel
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}