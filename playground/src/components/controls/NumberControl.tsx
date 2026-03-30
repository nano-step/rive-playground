interface Props {
  name: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberControl({
  name,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: Props) {
  return (
    <div className="control-row">
      <label className="control-label">{name}</label>
      <div className="number-control">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <input
          type="number"
          className="number-input"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
