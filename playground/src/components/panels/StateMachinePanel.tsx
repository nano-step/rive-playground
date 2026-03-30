import type { ArtboardInfo, SMInput } from "../../types";
import {
  SM_INPUT_BOOLEAN,
  SM_INPUT_NUMBER,
  SM_INPUT_TRIGGER,
} from "../../types";
import { BooleanControl } from "../controls/BooleanControl";
import { NumberControl } from "../controls/NumberControl";
import { TriggerControl } from "../controls/TriggerControl";
import { TypeBadge } from "../controls/TypeBadge";

interface Props {
  artboards: ArtboardInfo[];
  selectedArtboard: string;
  selectedStateMachine: string;
  smInputs: SMInput[];
  onSelectSM: (name: string) => void;
  onSetInput: (name: string, value: number | boolean) => void;
  onFireTrigger: (name: string) => void;
}

export function StateMachinePanel({
  artboards,
  selectedArtboard,
  selectedStateMachine,
  smInputs,
  onSelectSM,
  onSetInput,
  onFireTrigger,
}: Props) {
  const currentAb = artboards.find((a) => a.name === selectedArtboard);
  const stateMachines = currentAb?.stateMachines ?? [];

  if (stateMachines.length === 0) return null;

  return (
    <div className="panel">
      <div className="panel-header">🎛️ State Machine</div>
      <div className="panel-body">
        <div className="control-row">
          <label className="control-label">State Machine</label>
          <select
            className="enum-select"
            value={selectedStateMachine}
            onChange={(e) => onSelectSM(e.target.value)}
          >
            {stateMachines.map((sm) => (
              <option key={sm.name} value={sm.name}>
                {sm.name}
              </option>
            ))}
          </select>
        </div>

        {smInputs.length > 0 && (
          <div className="inputs-section">
            <div className="section-label">Inputs ({smInputs.length})</div>
            {smInputs.map((input) => {
              const typeName =
                input.type === SM_INPUT_BOOLEAN
                  ? "boolean"
                  : input.type === SM_INPUT_NUMBER
                    ? "number"
                    : input.type === SM_INPUT_TRIGGER
                      ? "trigger"
                      : "unknown";
              if (input.type === SM_INPUT_BOOLEAN) {
                return (
                  <div key={input.name} className="input-row">
                    <TypeBadge type={typeName} />
                    <BooleanControl
                      name={input.name}
                      value={Boolean(input.value)}
                      onChange={(v) => onSetInput(input.name, v)}
                    />
                  </div>
                );
              }
              if (input.type === SM_INPUT_NUMBER) {
                return (
                  <div key={input.name} className="input-row">
                    <TypeBadge type={typeName} />
                    <NumberControl
                      name={input.name}
                      value={Number(input.value ?? 0)}
                      onChange={(v) => onSetInput(input.name, v)}
                    />
                  </div>
                );
              }
              if (input.type === SM_INPUT_TRIGGER) {
                return (
                  <div key={input.name} className="input-row">
                    <TypeBadge type={typeName} />
                    <TriggerControl
                      name={input.name}
                      onFire={() => onFireTrigger(input.name)}
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {smInputs.length === 0 && (
          <div className="empty-hint">No inputs in this state machine</div>
        )}
      </div>
    </div>
  );
}
