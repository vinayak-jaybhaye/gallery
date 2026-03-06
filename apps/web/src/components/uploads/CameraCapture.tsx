import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
};

type CameraDevice = {
  deviceId: string;
  label: string;
};

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const startCamera = useCallback(async (deviceId?: string) => {
    // Check if we're in a secure context (required for getUserMedia on mobile)
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setError("Camera requires a secure connection (HTTPS)");
      setIsLoading(false);
      return;
    }

    // Check if getUserMedia is supported - handle various browser implementations
    const hasGetUserMedia = !!(
      navigator.mediaDevices?.getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia
    );

    if (!hasGetUserMedia) {
      setError("Camera not supported on this browser");
      setIsLoading(false);
      return;
    }

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      // Try with ideal constraints first, fallback to basic if needed
      let stream: MediaStream;

      // Use the standard API or polyfill
      const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
        || function (constraints: MediaStreamConstraints) {
          const legacyGetUserMedia = (navigator as any).webkitGetUserMedia
            || (navigator as any).mozGetUserMedia
            || (navigator as any).msGetUserMedia;

          if (!legacyGetUserMedia) {
            return Promise.reject(new Error('getUserMedia is not supported'));
          }

          return new Promise<MediaStream>((resolve, reject) => {
            legacyGetUserMedia.call(navigator, constraints, resolve, reject);
          });
        };

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1920, max: 4096 },
        height: { ideal: 1080, max: 2160 },
      };

      // Use specific device if provided, otherwise prefer environment camera
      if (deviceId) {
        videoConstraints.deviceId = { exact: deviceId };
      } else {
        videoConstraints.facingMode = { ideal: "environment" };
      }

      try {
        stream = await getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      } catch {
        // Fallback to basic constraints if ideal fails
        const fallbackConstraints: MediaTrackConstraints = deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: "environment" };
        stream = await getUserMedia({
          video: fallbackConstraints,
          audio: false,
        });
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

      // Enumerate cameras after getting permission
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, idx) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${idx + 1}`,
          }));
        setCameras(videoDevices);

        // Find current camera index
        if (deviceId) {
          const idx = videoDevices.findIndex((d) => d.deviceId === deviceId);
          if (idx !== -1) setCurrentCameraIndex(idx);
        }
      }

      setIsLoading(false);
    } catch (err) {
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
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [startCamera]);

  const switchCamera = useCallback(() => {
    if (cameras.length < 2) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    setIsLoading(true);
    startCamera(cameras[nextIndex].deviceId);
  }, [cameras, currentCameraIndex, startCamera]);

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
            setIsCapturing(false);
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
      setIsCapturing(false);
    } catch (err) {
      console.error("Capture error:", err);
      setError(err instanceof Error ? err.message : "Failed to capture photo");
      setIsCapturing(false);
    }
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Camera Unavailable</h3>
          <p className="text-white/70 mb-8">{error}</p>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between p-4 safe-area-inset-top">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <span className="text-white font-medium">Photo</span>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Camera Viewfinder */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/70">Starting camera...</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        />

        {/* Capture flash effect */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white animate-pulse pointer-events-none" />
        )}

        {/* Grid overlay (optional viewfinder guides) */}
        {!isLoading && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/10" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex items-center justify-center gap-8 py-8 px-6 safe-area-inset-bottom">
          {/* Gallery placeholder / Cancel */}
          <button
            onClick={onClose}
            className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Shutter Button */}
          <button
            onClick={capture}
            disabled={isLoading || isCapturing}
            className="relative w-20 h-20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white transition-transform group-hover:scale-105 group-active:scale-95" />
            {/* Inner circle */}
            <div className={`absolute inset-2 rounded-full bg-white transition-all ${isCapturing ? "scale-75 bg-white/70" : "group-hover:inset-2.5 group-active:inset-3"}`} />
          </button>

          {/* Switch Camera */}
          {cameras.length > 1 ? (
            <button
              onClick={switchCamera}
              disabled={isLoading}
              className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"
              title={`Switch to ${cameras[(currentCameraIndex + 1) % cameras.length]?.label || "next camera"}`}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          ) : (
            <div className="w-14 h-14" /> // Spacer
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}