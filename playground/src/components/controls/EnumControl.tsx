interface Props {
  name: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function EnumControl({ name, value, options, onChange }: Props) {
  return (
    <div className="control-row">
      <label className="control-label">{name}</label>
      <select
        className="enum-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
