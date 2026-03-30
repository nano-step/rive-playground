import { useState, useCallback, useRef } from "react";

interface Props {
  onLoadBuffer: (buffer: ArrayBuffer, fileName: string) => void;
  onLoadUrl: (url: string) => void;
  isLoading: boolean;
}

export function FileLoader({ onLoadBuffer, onLoadUrl, isLoading }: Props) {
  const [url, setUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          onLoadBuffer(reader.result, file.name);
        }
      };
      reader.onerror = () => {
        console.error("Failed to read file:", file.name, reader.error);
      };
      reader.readAsArrayBuffer(file);
    },
    [onLoadBuffer],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".riv")) handleFile(file);
    },
    [handleFile],
  );

  const handleUrlSubmit = useCallback(() => {
    const trimmed = url.trim();
    if (trimmed && trimmed.endsWith(".riv")) {
      onLoadUrl(trimmed);
      setUrl("");
    }
  }, [url, onLoadUrl]);

  return (
    <div
      className={`file-loader ${isDragging ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="file-loader-content">
        <div className="drop-zone" onClick={() => fileRef.current?.click()}>
          <div className="drop-visual">
            <div className="drop-icon-ring">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
          </div>
          <div className="drop-text-group">
            <span className="drop-title">
              {isLoading ? "Loading..." : "Drop your .riv file here"}
            </span>
            <span className="drop-subtitle">
              {isLoading
                ? "Please wait while the file is being processed"
                : "or click to browse from your computer"}
            </span>
          </div>
          <span className="drop-badge">.riv</span>
          <input
            ref={fileRef}
            type="file"
            accept=".riv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
        <div className="url-divider">
          <span className="url-divider-line" />
          <span className="url-divider-text">or load from URL</span>
          <span className="url-divider-line" />
        </div>
        <div className="url-input-row">
          <input
            type="url"
            className="url-input"
            placeholder="https://cdn.rive.app/animations/example.riv"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          />
          <button
            className="url-btn"
            onClick={handleUrlSubmit}
            disabled={isLoading}
          >
            Load
          </button>
        </div>
      </div>
    </div>
  );
}
