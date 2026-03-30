import type { ArtboardInfo } from "../../types";

interface Props {
  artboards: ArtboardInfo[];
  selectedArtboard: string;
  selectedAnimation: string;
  onSelectArtboard: (name: string) => void;
}

function formatDuration(seconds: number): string {
  return seconds >= 1 ? `${seconds.toFixed(2)}s` : `${(seconds * 1000).toFixed(0)}ms`;
}

function artboardLabel(ab: ArtboardInfo): string {
  const prefix = ab.isDefault ? "★ " : "";
  const dims =
    ab.width > 0 || ab.height > 0 ? ` (${ab.width}×${ab.height})` : "";
  return `${prefix}${ab.name}${dims}`;
}

export function ArtboardPanel({
  artboards,
  selectedArtboard,
  onSelectArtboard,
}: Props) {
  const currentAb = artboards.find((a) => a.name === selectedArtboard);

  return (
    <div className="panel">
      <div className="panel-header">📋 Artboard</div>
      <div className="panel-body">
        <div className="control-row">
          <label className="control-label">Artboard</label>
          <select
            className="enum-select"
            value={selectedArtboard}
            onChange={(e) => onSelectArtboard(e.target.value)}
          >
            {artboards.map((ab) => (
              <option key={ab.name} value={ab.name}>
                {artboardLabel(ab)}
              </option>
            ))}
          </select>
        </div>

        {currentAb && (currentAb.width > 0 || currentAb.height > 0) && (
          <div className="info-block">
            <span className="info-label">Size:</span>
            <span className="info-value">
              {currentAb.width} × {currentAb.height}
            </span>
          </div>
        )}

        {currentAb && currentAb.animations.length > 0 && (
          <div className="inputs-section">
            <div className="section-label">
              Animations ({currentAb.animations.length})
            </div>
            {currentAb.animations.map((anim) => (
              <div key={anim.name} className="control-row">
                <span className="control-label">{anim.name}</span>
                <span className="info-value">
                  {formatDuration(anim.duration)} @ {anim.fps}fps
                </span>
              </div>
            ))}
          </div>
        )}

        {currentAb && currentAb.stateMachines.length > 0 && (
          <div className="info-block">
            <span className="info-label">State Machines:</span>
            <span className="info-value">
              {currentAb.stateMachines.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
