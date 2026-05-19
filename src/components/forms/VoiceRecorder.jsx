import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";

/**
 * Voice recorder + live speech-to-text. Built for vendors who'd rather
 * speak than type — especially useful for vendors with limited literacy
 * who still need to leave notes on a quote, accept/reject reason, etc.
 *
 * Two things happen simultaneously when the user holds Record:
 *   1. The browser's MediaRecorder captures audio (WebM/Opus) which is
 *      returned to the parent as a base64 data URL via `onAudioChange`.
 *      The parent can ship it to the backend alongside the text comment.
 *   2. The browser's `SpeechRecognition` API live-transcribes the audio
 *      into text and streams it back via `onTranscript` so it can fill
 *      a sibling textarea in real time. Vendor sees their words appear
 *      as they speak.
 *
 * Falls back gracefully when speech recognition isn't available (Firefox,
 * some mobile browsers): audio recording still works, just no transcript.
 * Audio recording itself requires HTTPS or localhost — getUserMedia is
 * blocked on plain HTTP per the browser security model.
 *
 * Props:
 *   onTranscript(text)         — called each time the transcript grows
 *   onAudioChange(b64 | null)  — called when the recorded audio is finalised,
 *                                or null when the user deletes the take
 *   language                   — BCP-47 lang tag for recognition (default en-IN)
 *   maxSeconds                 — auto-stop after this many seconds (default 90)
 *   disabled                   — locks the controls
 *   className
 */
export default function VoiceRecorder({
  onTranscript,
  onAudioChange,
  language = "en-IN",
  maxSeconds = 90,
  disabled = false,
  className = "",
}) {
  const [status, setStatus] = useState("idle"); // idle | requesting | recording | stopped | error
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [interim, setInterim] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const tickRef = useRef(null);
  const stopTimerRef = useRef(null);
  const audioElRef = useRef(null);
  const baseTranscriptRef = useRef(""); // what was committed in earlier sessions

  const speechSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  // Cleanup on unmount: stop any active streams + timers so we don't leak
  // a hot microphone after the user navigates away mid-recording.
  useEffect(() => {
    return () => {
      cleanupStreams();
      if (tickRef.current) clearInterval(tickRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupStreams = () => {
    try {
      mediaRecorderRef.current?.state === "recording" &&
        mediaRecorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    try {
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    mediaRecorderRef.current = null;
    audioStreamRef.current = null;
    recognitionRef.current = null;
  };

  const start = async () => {
    if (disabled || status === "recording" || status === "requesting") return;
    setError(null);
    setStatus("requesting");
    setInterim("");

    try {
      // Audio recording via MediaRecorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mime || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        // Convert to base64 for backend transport. We strip the data: prefix
        // here — the parent gets the raw base64 string + decides what format
        // to send. (Mime is constant: audio/webm.)
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result);
          onAudioChange?.(dataUrl);
        };
        reader.readAsDataURL(blob);
      };
      rec.start();

      // Live transcript via SpeechRecognition (if available)
      if (speechSupported) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const r = new SR();
        r.continuous = true;
        r.interimResults = true;
        r.lang = language;
        let committed = "";
        r.onresult = (ev) => {
          let live = "";
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const transcript = ev.results[i][0].transcript;
            if (ev.results[i].isFinal) {
              committed += transcript;
            } else {
              live += transcript;
            }
          }
          setInterim(live);
          const full = (baseTranscriptRef.current + committed).trim();
          onTranscript?.(full + (live ? (full ? " " : "") + live : ""));
          // After the final commits stop arriving, baseTranscriptRef will be
          // updated on stop() — we keep `committed` local until then so
          // re-pauses cleanly resume.
        };
        r.onerror = (ev) => {
          // network / no-speech / not-allowed → surface only the not-allowed
          // class of errors. The others happen during normal pauses.
          if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
            setError("Microphone access was blocked.");
          }
        };
        r.onend = () => {
          // Persist whatever we committed so the next session appends rather
          // than overwriting.
          baseTranscriptRef.current = (baseTranscriptRef.current + committed).trim();
        };
        recognitionRef.current = r;
        try {
          r.start();
        } catch {
          /* already started — ignore */
        }
      }

      // UI ticks
      const startedAt = Date.now();
      tickRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 250);
      // Auto-stop at the cap so we don't accidentally record an hour
      stopTimerRef.current = setTimeout(() => stop(), maxSeconds * 1000);

      setStatus("recording");
    } catch (err) {
      setStatus("error");
      const msg =
        err?.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone in your browser settings."
          : err?.name === "NotFoundError"
            ? "No microphone found on this device."
            : err?.message ?? "Could not start recording.";
      setError(msg);
      cleanupStreams();
    }
  };

  const stop = () => {
    if (status !== "recording") return;
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    try {
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    if (tickRef.current) clearInterval(tickRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    setStatus("stopped");
    setInterim("");
  };

  const reset = () => {
    cleanupStreams();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioChunksRef.current = [];
    baseTranscriptRef.current = "";
    setAudioUrl(null);
    setElapsed(0);
    setInterim("");
    setStatus("idle");
    setIsPlaying(false);
    onAudioChange?.(null);
  };

  const togglePlay = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const mins = String(Math.floor(elapsed / 60)).padStart(1, "0");
  const secs = String(elapsed % 60).padStart(2, "0");
  const timer = `${mins}:${secs}`;
  const isRecording = status === "recording";
  const hasRecording = status === "stopped" && audioUrl;

  return (
    <div
      className={`rounded-xl border border-border bg-surface-container-low/40 p-3 ${className}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {!hasRecording && (
          <button
            type="button"
            onClick={isRecording ? stop : start}
            disabled={disabled || status === "requesting"}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-[12px] font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
              isRecording
                ? "bg-danger text-white shadow-[0_4px_12px_-3px_color-mix(in_srgb,var(--color-danger)_55%,transparent)]"
                : "bg-primary text-primary-foreground hover:brightness-110 shadow-sm"
            }`}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {status === "requesting" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isRecording ? (
              <Square className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            {status === "requesting"
              ? "Requesting mic…"
              : isRecording
                ? "Stop"
                : "Record voice"}
          </button>
        )}

        {hasRecording && (
          <>
            <audio
              ref={audioElRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              className="hidden"
            />
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[12px] font-bold bg-info-soft text-info hover:bg-info/15 transition-colors"
              aria-label={isPlaying ? "Pause playback" : "Play recording"}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold text-text-muted border border-border bg-surface-container-low/60 hover:text-danger hover:border-danger/30 transition-colors disabled:opacity-60"
              aria-label="Delete recording"
              title="Delete this recording and start fresh"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Re-record
            </button>
          </>
        )}

        {/* Status indicator */}
        {isRecording && (
          <div className="inline-flex items-center gap-2 ml-1">
            <span
              className="w-2 h-2 rounded-full bg-danger animate-pulse"
              aria-hidden
            />
            <span className="text-[12px] font-mono tabular-nums text-danger font-bold">
              {timer}
            </span>
            <span className="text-[11px] text-text-muted hidden sm:inline">
              speak now — auto-stops at {Math.floor(maxSeconds / 60)}:
              {String(maxSeconds % 60).padStart(2, "0")}
            </span>
          </div>
        )}
        {hasRecording && (
          <span className="text-[11px] text-text-muted ml-1 tabular-nums">
            {timer} captured
          </span>
        )}
      </div>

      {/* Live transcript preview while recording */}
      {isRecording && interim && (
        <div className="mt-2.5 px-3 py-2 rounded-md bg-surface-container-lowest border border-border text-[12.5px] text-text-muted italic min-h-[1.5em]">
          {interim}
        </div>
      )}

      {/* Capability/permission warnings */}
      {!speechSupported && status === "idle" && !hasRecording && (
        <p className="mt-2 text-[11px] text-text-subtle inline-flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          Live transcription isn't available in this browser — audio will
          still record but won't auto-fill the text box.
        </p>
      )}
      {error && (
        <p className="mt-2 text-[11.5px] text-danger inline-flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
