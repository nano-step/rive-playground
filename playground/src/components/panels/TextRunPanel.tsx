import { useState } from "react";
import type { TextRunEntry } from "../../types";
import { TextControl } from "../controls/TextControl";

interface Props {
  textRuns: TextRunEntry[];
  onSetTextRun: (name: string, value: string) => void;
  onAddTextRun: (name: string) => void;
}

export function TextRunPanel({ textRuns, onSetTextRun, onAddTextRun }: Props) {
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      onAddTextRun(trimmed);
      setNewName("");
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">📝 Text Runs</div>
      <div className="panel-body">
        {textRuns.map((tr) => (
          <TextControl
            key={tr.name}
            name={tr.name}
            value={tr.value}
            onChange={(v) => onSetTextRun(tr.name, v)}
          />
        ))}

        <div className="add-row">
          <input
            type="text"
            className="text-input"
            placeholder="Text run name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button className="add-btn" onClick={handleAdd}>
            + Add
          </button>
        </div>

        {textRuns.length === 0 && (
          <div className="empty-hint">
            Add text run names to inspect and edit them. Names must match the
            text run node names in Rive Editor.
          </div>
        )}
      </div>
    </div>
  );
}
