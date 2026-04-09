import { useState } from "react";
import type { ViewModelProperty, ListAction } from "../../types";
import { TextControl } from "../controls/TextControl";
import { NumberControl } from "../controls/NumberControl";
import { BooleanControl } from "../controls/BooleanControl";
import { EnumControl } from "../controls/EnumControl";
import { ColorControl } from "../controls/ColorControl";
import { ImageControl } from "../controls/ImageControl";
import { TriggerControl } from "../controls/TriggerControl";
import { TypeBadge } from "../controls/TypeBadge";
import { ListControl } from "../controls/ListControl";

interface Props {
  properties: ViewModelProperty[];
  onSetProp: (
    path: string,
    type: string,
    value: string | number | boolean | ArrayBuffer,
  ) => void;
  onListAction: (action: ListAction) => void;
}

function ViewModelNode({
  prop,
  onSetProp,
  onListAction,
}: {
  prop: ViewModelProperty;
  onSetProp: Props["onSetProp"];
  onListAction: Props["onListAction"];
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
            <span className="vm-toggle-icon">
              {expanded
                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M10 7l5 5-5 5z"/></svg>
              }
            </span>
          </button>
          {expanded && prop.children && prop.children.length > 0 && (
            <div className="vm-children">
              {prop.children.map((child) => (
                <ViewModelNode key={child.path} prop={child} onSetProp={onSetProp} onListAction={onListAction} />
              ))}
            </div>
          )}
        </div>
      );
    case "list":
      return (
        <ListControl
          key={prop.path}
          prop={prop}
          onListAction={onListAction}
          renderChildren={(children) =>
            children.map((child) => (
              <ViewModelNode key={child.path} prop={child} onSetProp={onSetProp} onListAction={onListAction} />
            ))
          }
        />
      );
    case "listItem": {
      const pathMatch = /^(.+)\[(\d+)\]$/.exec(prop.path);
      const listPath = pathMatch?.[1] ?? "";
      const index = pathMatch ? parseInt(pathMatch[2], 10) : 0;
      const siblingCount = prop.children?.length ?? 0;
      void siblingCount;
      return (
        <div className="vm-nested vm-list-item" key={prop.path}>
          <button
            className="vm-toggle"
            onClick={() => setExpanded((v) => !v)}
            type="button"
          >
            <TypeBadge type="listItem" />
            <span>{prop.name}</span>
            <div className="vm-list-item-actions">
              <button
                type="button"
                className="vm-list-item-btn"
                onClick={(e) => { e.stopPropagation(); onListAction({ action: "swap", listPath, indexA: index - 1, indexB: index }); }}
                disabled={index === 0}
                title="Move up"
              >↑</button>
              <button
                type="button"
                className="vm-list-item-btn"
                onClick={(e) => { e.stopPropagation(); onListAction({ action: "swap", listPath, indexA: index, indexB: index + 1 }); }}
                title="Move down"
              >↓</button>
              <button
                type="button"
                className="vm-list-item-btn vm-list-item-remove"
                onClick={(e) => { e.stopPropagation(); onListAction({ action: "remove", listPath, index }); }}
                title="Remove item"
              >✕</button>
            </div>
            <span className="vm-toggle-icon">
              {expanded
                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M10 7l5 5-5 5z"/></svg>
              }
            </span>
          </button>
          {expanded && prop.children && prop.children.length > 0 && (
            <div className="vm-children">
              {prop.children.map((child) => (
                <ViewModelNode key={child.path} prop={child} onSetProp={onSetProp} onListAction={onListAction} />
              ))}
            </div>
          )}
        </div>
      );
    }
    default:
      return (
        <div className="input-row" key={prop.path}>
          <TypeBadge type={prop.type} />
          <div className="control-row">
            <label className="control-label">{prop.name}</label>
            <span className="info-value">{String(prop.value ?? "-")}</span>
          </div>
        </div>
      );
  }
}

export function ViewModelPanel({ properties, onSetProp, onListAction }: Props) {
  if (properties.length === 0) return null;

  return (
    <div className="panel">
      <div className="panel-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        ViewModel
      </div>
      <div className="panel-body">
        {properties.map((prop) => (
          <ViewModelNode key={prop.path} prop={prop} onSetProp={onSetProp} onListAction={onListAction} />
        ))}
      </div>
    </div>
  );
}
