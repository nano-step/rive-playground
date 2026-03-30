import { useState } from "react";

interface Props {
  name: string;
  onFire: () => void;
}

export function TriggerControl({ name, onFire }: Props) {
  const [fired, setFired] = useState(false);

  const handleFire = () => {
    onFire();
    setFired(true);
    setTimeout(() => setFired(false), 300);
  };

  return (
    <div className="control-row">
      <label className="control-label">{name}</label>
      <button
        className={`trigger-btn ${fired ? "fired" : ""}`}
        onClick={handleFire}
      >
        🔥 Fire
      </button>
    </div>
  );
}
