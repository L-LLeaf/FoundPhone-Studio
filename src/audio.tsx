import { useEffect, useRef, useState } from "react";
import type { SkinProps } from "./AppSkins";
import { safeMedia, type Item } from "./schema";
import { useSkinState } from "./skinState";
export function useTrack(
  p: SkinProps,
  items: Item[],
): [Item | null, (item: Item | null) => void] {
  const [id, setId] = useSkinState<string>(p, "track", "");
  return [
    items.find((i) => i.id === id) ?? null,
    (item) => {
      setId(item?.id ?? "");
      if (item) p.onRead(item.id);
    },
  ];
}
export function AudioPlayer({ p, item }: { p: SkinProps; item: Item }) {
  const last = useRef(-1);
  const element = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState("");
  const key = `audio-${item.id}`;
  const saved = p.ui?.[key];
  const limit = 60;
  const commit = (time: number, force = false) => {
    if (!p.onUi || !Number.isFinite(time)) return;
    if (force || Math.abs(time - last.current) >= 5) {
      last.current = time;
      p.onUi(key, time);
    }
  };
  useEffect(() => {
    const audio = element.current;
    if (!audio) return;
    const restore = () => {
      setDuration(Number.isFinite(audio.duration) ? Math.min(audio.duration, limit) : limit);
      if (
        typeof saved === "number" &&
        Number.isFinite(saved) &&
        saved > 0 &&
        saved < limit &&
        audio.readyState >= 1
      ) {
        last.current = saved;
        audio.currentTime = Math.min(saved, audio.duration || saved, limit);
        setCurrentTime(audio.currentTime);
      }
    };
    restore();
    audio.addEventListener("loadedmetadata", restore);
    return () => audio.removeEventListener("loadedmetadata", restore);
  }, [item.id]);
  const togglePlayback = async () => {
    const audio = element.current;
    if (!audio) return;
    setError("");
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (audio.currentTime >= limit || (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration)) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError("播放失败，请检查音频文件或重试");
    }
  };
  const shownDuration = Math.min(duration || limit, limit);
  const format = (value: number) => {
    const safe = Math.max(0, Math.floor(value || 0));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  };
  return (
    <div className="phone-audio-player">
      <audio
        ref={element}
        preload="metadata"
        src={safeMedia(item.media)}
        aria-label={`播放${item.title}`}
        onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? Math.min(e.currentTarget.duration, limit) : limit)}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          if (audio.currentTime >= limit) {
            audio.pause();
            audio.currentTime = limit;
            setPlaying(false);
            setCurrentTime(limit);
            commit(limit, true);
            return;
          }
          setCurrentTime(audio.currentTime);
          commit(audio.currentTime);
        }}
        onPlay={() => setPlaying(true)}
        onPause={(e) => {
          setPlaying(false);
          setCurrentTime(Math.min(e.currentTarget.currentTime, limit));
          commit(Math.min(e.currentTarget.currentTime, limit), true);
        }}
        onEnded={(e) => {
          setPlaying(false);
          setCurrentTime(Math.min(e.currentTarget.currentTime, limit));
          commit(Math.min(e.currentTarget.currentTime, limit), true);
        }}
        onError={() => {
          setPlaying(false);
          setError("音频加载失败，请稍后重试");
        }}
      />
      <button
        className="phone-audio-play"
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? "暂停" : "播放"}
      >
        {playing ? "Ⅱ" : "▶"}
      </button>
      <div className="phone-audio-progress">
        <input
          type="range"
          min={0}
          max={shownDuration || limit}
          step={0.1}
          value={Math.min(currentTime, shownDuration || limit)}
          aria-label="播放进度"
          onChange={(e) => {
            const next = Number(e.currentTarget.value);
            if (element.current) element.current.currentTime = next;
            setCurrentTime(next);
            commit(next, true);
          }}
        />
        <div className="phone-audio-times">
          <span>{format(currentTime)}</span>
          <span>{format(shownDuration)}</span>
        </div>
      </div>
      {error ? <small className="phone-audio-error">{error}</small> : null}
      <small className="phone-audio-limit">试听 1 分钟</small>
    </div>
  );
}
