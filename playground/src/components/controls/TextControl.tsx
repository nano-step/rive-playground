interface Props {
  name: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextControl({ name, value, onChange }: Props) {
  return (
    <div className="control-row">
      <label className="control-label">{name}</label>
      <input
        type="text"
        className="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
