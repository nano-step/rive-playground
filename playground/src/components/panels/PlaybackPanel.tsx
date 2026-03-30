interface Props {
  isLoaded: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function PlaybackPanel({ isLoaded, onPlay, onPause, onReset }: Props) {
  if (!isLoaded) return null;

  return (
    <div className="playback-float">
      <div className="playback-controls">
        <button className="playback-btn" onClick={onPlay} title="Play">
          ▶
        </button>
        <button className="playback-btn" onClick={onPause} title="Pause">
          ⏸
        </button>
        <button className="playback-btn" onClick={onReset} title="Reset">
          ↺
        </button>
      </div>
    </div>
  );
}
