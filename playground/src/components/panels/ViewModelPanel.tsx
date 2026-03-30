import { useState } from "react";
import type { ViewModelProperty } from "../../types";
import { TextControl } from "../controls/TextControl";
import { NumberControl } from "../controls/NumberControl";
import { BooleanControl } from "../controls/BooleanControl";
import { EnumControl } from "../controls/EnumControl";
import { ColorControl } from "../controls/ColorControl";
import { ImageControl } from "../controls/ImageControl";
import { TriggerControl } from "../controls/TriggerControl";
import { TypeBadge } from "../controls/TypeBadge";

interface Props {
  properties: ViewModelProperty[];
  onSetProp: (
    path: string,
    type: string,
    value: string | number | boolean | ArrayBuffer,
  ) => void;
}

function ViewModelNode({
  prop,
  onSetProp,
}: {
  prop: ViewModelProperty;
  onSetProp: Props["onSetProp"];
}) {
  const [expanded, setExpanded] = useState(true);

  switch (prop.type) {
    case "string":
      return (
        <div className="input-row" key={prop.path}>
          <TypeBadge type="string" />
          <TextControl
            name={prop.name}
            value={String(prop.value ?? "")}
            onChange={(v) => onSetProp(prop.path, prop.type, v)}
          />
        </div>
      );
    case "number":
      return (
        <div className="input-row" key={prop.path}>
          <TypeBadge type="number" />
          <NumberControl
            name={prop.name}
            value={Number(prop.value ?? 0)}
            onChange={(v) => onSetProp(prop.path, prop.type, v)}
          />
        </div>
      );
    case "boolean":
      return (
        <div className="input-row" key={prop.path}>
          <TypeBadge type="boolean" />
          <BooleanControl
            name={prop.name}
            value={Boolean(prop.value)}
            onChange={(v) => onSetProp(prop.path, prop.type, v)}
          />
        </div>
      );
    case "enumType":
      return (
        <div className="input-row" key={prop.path}>
          <TypeBadge type="enum" />
          <EnumControl
            name={prop.name}
            value={String(prop.value ?? "")}
            options={prop.enumValues ?? []}
            onChange={(v) => onSetProp(prop.path, prop.type, v)}
          />
        </div>
      );
    case "color":
      return (
        <div className="input-row" key={prop.path}>
          <TypeBadge type="color" />
          <ColorControl
            name={prop.name}
            value={Number(prop.value ?? 0)}
            onChange={(v) => onSetProp(prop.path, prop.type, v)}
          />
        </div>
      );
    case "image":
      return (
        <div className="input-row" key={prop.path}>
          <TypeBadge type="image" />
          <ImageControl
            name={prop.name}
            imageUrl={prop.imageUrl}
            onSetUrl={(url) => onSetProp(prop.path, prop.type, url)}
            onSetFile={(buf) => onSetProp(prop.path, prop.type, buf)}
          />
        </div>
      );
    case "trigger":
      return (
        <div className="input-row" key={prop.path}>
          <TypeBadge type="trigger" />
          <TriggerControl
            name={prop.name}
            onFire={() => onSetProp(prop.path, prop.type, true)}
          />
        </div>
      );
    case "viewModel":
      return (
        <div className="vm-nested" key={prop.path}>
          <button
            className="vm-toggle"
            onClick={() => setExpanded((v) => !v)}
            type="button"
          >
            <TypeBadge type="viewModel" />
            <span>{prop.name}</span>
            <span className="vm-toggle-icon">{expanded ? "▾" : "▸"}</span>
          </button>
          {expanded && prop.children && prop.children.length > 0 && (
            <div className="vm-children">
              {prop.children.map((child) => (
                <ViewModelNode key={child.path} prop={child} onSetProp={onSetProp} />
              ))}
            </div>
          )}
        </div>
      );
    default:
      return (
        <div className="input-row" key={prop.path}>
          <TypeBadge type={prop.type} />
          <div className="control-row">
            <label className="control-label">{prop.name}</label>
            <span className="info-value">{String(prop.value ?? "—")}</span>
          </div>
        </div>
      );
  }
}

export function ViewModelPanel({ properties, onSetProp }: Props) {
  if (properties.length === 0) return null;

  return (
    <div className="panel">
      <div className="panel-header">🔧 ViewModel</div>
      <div className="panel-body">
        {properties.map((prop) => (
          <ViewModelNode key={prop.path} prop={prop} onSetProp={onSetProp} />
        ))}
      </div>
    </div>
  );
}
