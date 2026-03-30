import { useState, useCallback, useRef } from "react";

interface Props {
  name: string;
  imageUrl?: string;
  onSetUrl: (url: string) => void;
  onSetFile: (buffer: ArrayBuffer) => void;
}

export function ImageControl({ name, imageUrl, onSetUrl, onSetFile }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(imageUrl);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setLoading(true);
    setPreviewSrc(trimmed);
    onSetUrl(trimmed);
    setTimeout(() => setLoading(false), 1500);
    setUrlInput("");
  }, [urlInput, onSetUrl]);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setLoading(true);
      setPreviewSrc(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          onSetFile(reader.result);
        }
        setLoading(false);
      };
      reader.onerror = () => setLoading(false);
      reader.readAsArrayBuffer(file);
    },
    [onSetFile],
  );

  return (
    <div className="control-row image-control">
      <label className="control-label">{name}</label>
      <div className="image-control-body">
        {previewSrc && (
          <div className="image-preview">
            <img src={previewSrc} alt={name} />
          </div>
        )}
        <div className="image-actions">
          <input
            type="url"
            className="url-input image-url-input"
            placeholder="Image URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          />
          <button
            className="export-btn"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            {loading ? "..." : "Upload"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFile}
          />
        </div>
      </div>
    </div>
  );
}
