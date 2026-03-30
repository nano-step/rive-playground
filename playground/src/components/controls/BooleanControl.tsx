interface Props {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function BooleanControl({ name, value, onChange }: Props) {
  return (
    <div className="control-row">
      <label className="control-label">{name}</label>
      <button
        className={`toggle-switch ${value ? "active" : ""}`}
        onClick={() => onChange(!value)}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  );
}
