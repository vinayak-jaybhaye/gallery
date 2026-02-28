import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db/db";
import { startUpload } from "@/api/upload";
import { getUploadWorker } from "@/lib/uploads/workerManager";

function getSupportedMimeType() {
  const types = [
    // Video + Audio codecs
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=h264,opus",
    "video/mp4;codecs=h264,aac",
    "video/mp4;codecs=avc1,mp4a.40.2",
    // Fallbacks without explicit audio codec
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  return types.find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

export default function VideoCapture({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const bufferRef = useRef<Blob[]>([]);
  const bufferSizeRef = useRef(0);
  const partNumberRef = useRef(1);

  const mediaIdRef = useRef<string | null>(null);
  const partSizeRef = useRef<number>(0);
  const mimeTypeRef = useRef<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });

        // Verify we have both video and audio tracks
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        console.log("Video tracks:", videoTracks.length, videoTracks.map(t => t.label));
        console.log("Audio tracks:", audioTracks.length, audioTracks.map(t => t.label));

        if (audioTracks.length === 0) {
          console.warn("No audio track available - trying to get audio separately");

          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });

            audioStream.getAudioTracks().forEach(track => {
              stream.addTrack(track);
            });

            console.log("Added audio track separately");
          } catch (audioErr) {
            console.error("Failed to get audio:", audioErr);
            alert("Could not access microphone. Video will record without audio.");
          }
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const mimeType = getSupportedMimeType();
        if (!mimeType) {
          alert("No supported recording format found");
          return;
        }

        mimeTypeRef.current = mimeType;
        console.log("Using mimeType:", mimeType);

        recorderRef.current = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 8_000_000, // 8 Mbps
          audioBitsPerSecond: 128_000,   // 128 kbps audio
        });

        recorderRef.current.ondataavailable = handleChunk;

        recorderRef.current.onstop = async () => {
          // flush remaining buffered data
          if (bufferSizeRef.current > 0) {
            await createPart();
          }

          if (mediaIdRef.current) {
            getUploadWorker().postMessage({
              type: "RECORDING_FINISHED",
              mediaId: mediaIdRef.current,
            });
          }
        };
      } catch (err) {
        console.error("Camera/mic init error:", err);
        alert("Failed to access camera or microphone. Please check permissions.");
      }
    }

    initCamera();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    if (!recorderRef.current || !mimeTypeRef.current) return;

    const res = await startUpload({
      type: "video",
      mimeType: mimeTypeRef.current.split(";")[0],
      title: "Recording",
    });

    if (res.uploadType !== "multipart" || !res.partSize) {
      throw new Error("Expected multipart upload for video");
    }

    mediaIdRef.current = res.mediaId;
    partSizeRef.current = res.partSize;

    partNumberRef.current = 1;
    bufferRef.current = [];
    bufferSizeRef.current = 0;

    recorderRef.current.start(1000); // emit chunk every 1s
    setIsRecording(true);
  }

  async function handleChunk(event: BlobEvent) {
    if (!event.data.size || !mediaIdRef.current) return;

    bufferRef.current.push(event.data);
    bufferSizeRef.current += event.data.size;

    if (bufferSizeRef.current >= partSizeRef.current) {
      await createPart();
    }
  }

  async function createPart() {
    const blob = new Blob(bufferRef.current);

    await db.parts.add({
      mediaId: mediaIdRef.current!,
      partNumber: partNumberRef.current,
      blob,
      uploaded: false,
      retries: 0,
    });

    getUploadWorker().postMessage({
      type: "START_UPLOAD",
      mediaId: mediaIdRef.current,
    });

    partNumberRef.current++;
    bufferRef.current = [];
    bufferSizeRef.current = 0;
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="max-h-[75vh] rounded-lg"
      />

      <div className="mt-6 flex gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="bg-green-600 px-4 py-2 rounded"
          >
            Start
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-600 px-4 py-2 rounded"
          >
            Stop
          </button>
        )}

        <button
          onClick={onClose}
          className="bg-gray-600 px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}