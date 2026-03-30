interface Props {
  name: string;
  value: number;
  onChange: (value: number) => void;
}

function argbToHex(argb: number): string {
  const r = (argb >> 16) & 0xff;
  const g = (argb >> 8) & 0xff;
  const b = argb & 0xff;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function hexToArgb(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0xff << 24) | (r << 16) | (g << 8) | b;
}

export function ColorControl({ name, value, onChange }: Props) {
  return (
    <div className="control-row">
      <label className="control-label">{name}</label>
      <input
        type="color"
        className="color-input"
        value={argbToHex(value)}
        onChange={(e) => onChange(hexToArgb(e.target.value))}
      />
    </div>
  );
}
