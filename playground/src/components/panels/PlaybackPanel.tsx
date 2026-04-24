import type { FitMode } from "../RiveCanvas";

const FIT_OPTIONS: FitMode[] = ["Contain", "Cover", "Fill", "FitWidth", "FitHeight", "ScaleDown", "None", "Layout"];

interface Props {
  isLoaded: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  fitMode: FitMode;
  onFitModeChange: (mode: FitMode) => void;
}

export function PlaybackPanel({ isLoaded, onPlay, onPause, onReset, fitMode, onFitModeChange }: Props) {
  if (!isLoaded) return null;

  return (
    <div className="playback-float">
      <div className="playback-controls">
        <button className="playback-btn" onClick={onPlay} title="Play">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        </button>
        <button className="playback-btn" onClick={onPause} title="Pause">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        </button>
        <button className="playback-btn" onClick={onReset} title="Reset">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5.6"/></svg>
        </button>
        <div className="playback-divider" />
        <select
          className="playback-fit-select"
          value={fitMode}
          onChange={(e) => onFitModeChange(e.target.value as FitMode)}
          title="Fit mode"
        >
          {FIT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
