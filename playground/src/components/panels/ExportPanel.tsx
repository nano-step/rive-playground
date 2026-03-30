import { useCallback, useState } from "react";
import type { PlaygroundState } from "../../types";
import { SM_INPUT_BOOLEAN, SM_INPUT_NUMBER, SM_INPUT_TRIGGER } from "../../types";

interface Props {
  state: PlaygroundState;
}

function inputTypeName(type: number): string {
  if (type === SM_INPUT_BOOLEAN) return "boolean";
  if (type === SM_INPUT_NUMBER) return "number";
  if (type === SM_INPUT_TRIGGER) return "trigger";
  return "unknown";
}

function buildExportData(state: PlaygroundState) {
  const currentAb = state.artboards.find(
    (a) => a.name === state.selectedArtboard,
  );

  return {
    fileName: state.fileName,
    artboard: state.selectedArtboard,
    artboardSize: currentAb
      ? { width: currentAb.width, height: currentAb.height }
      : null,
    stateMachine: state.selectedStateMachine,
    inputs: state.smInputs.map((inp) => ({
      name: inp.name,
      type: inputTypeName(inp.type),
      value: inp.type === SM_INPUT_TRIGGER ? null : (inp.value ?? null),
    })),
    textRuns: state.textRuns.map((tr) => ({
      name: tr.name,
      value: tr.value,
    })),
    viewModelProperties: state.viewModelProps.map((p) => ({
      name: p.name,
      type: p.type,
      value: p.value ?? null,
    })),
  };
}

function toJSON(state: PlaygroundState): string {
  return JSON.stringify(buildExportData(state), null, 2);
}

function toMarkdown(state: PlaygroundState): string {
  const data = buildExportData(state);
  const lines: string[] = [];

  lines.push(`# Rive Configuration`);
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| File | ${data.fileName} |`);
  lines.push(`| Artboard | ${data.artboard} |`);
  if (data.artboardSize) {
    lines.push(
      `| Size | ${data.artboardSize.width} x ${data.artboardSize.height} |`,
    );
  }
  lines.push(`| State Machine | ${data.stateMachine} |`);

  if (data.inputs.length > 0) {
    lines.push("");
    lines.push(`## State Machine Inputs`);
    lines.push("");
    lines.push(`| Name | Type | Value |`);
    lines.push(`|------|------|-------|`);
    for (const inp of data.inputs) {
      const val = inp.value === null ? "—" : String(inp.value);
      lines.push(`| ${inp.name} | ${inp.type} | ${val} |`);
    }
  }

  if (data.textRuns.length > 0) {
    lines.push("");
    lines.push(`## Text Runs`);
    lines.push("");
    lines.push(`| Name | Value |`);
    lines.push(`|------|-------|`);
    for (const tr of data.textRuns) {
      lines.push(`| ${tr.name} | ${tr.value} |`);
    }
  }

  if (data.viewModelProperties.length > 0) {
    lines.push("");
    lines.push(`## ViewModel Properties`);
    lines.push("");
    lines.push(`| Name | Type | Value |`);
    lines.push(`|------|------|-------|`);
    for (const p of data.viewModelProperties) {
      lines.push(`| ${p.name} | ${p.type} | ${p.value ?? "—"} |`);
    }
  }

  return lines.join("\n");
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel({ state }: Props) {
  const [copied, setCopied] = useState<"json" | "md" | null>(null);

  const baseName = state.fileName.replace(/\.riv$/, "") || "rive-config";

  const handleCopy = useCallback(
    (format: "json" | "md") => {
      const content = format === "json" ? toJSON(state) : toMarkdown(state);
      navigator.clipboard.writeText(content).then(() => {
        setCopied(format);
        setTimeout(() => setCopied(null), 1500);
      });
    },
    [state],
  );

  const handleDownload = useCallback(
    (format: "json" | "md") => {
      if (format === "json") {
        download(toJSON(state), `${baseName}.json`, "application/json");
      } else {
        download(toMarkdown(state), `${baseName}.md`, "text/markdown");
      }
    },
    [state, baseName],
  );

  if (!state.isLoaded) return null;

  return (
    <div className="panel">
      <div className="panel-header">📤 Export</div>
      <div className="panel-body">
        <div className="export-row">
          <span className="control-label">JSON</span>
          <div className="export-actions">
            <button
              className={`export-btn ${copied === "json" ? "copied" : ""}`}
              onClick={() => handleCopy("json")}
            >
              {copied === "json" ? "✓ Copied" : "Copy"}
            </button>
            <button
              className="export-btn"
              onClick={() => handleDownload("json")}
            >
              Save
            </button>
          </div>
        </div>
        <div className="export-row">
          <span className="control-label">Markdown</span>
          <div className="export-actions">
            <button
              className={`export-btn ${copied === "md" ? "copied" : ""}`}
              onClick={() => handleCopy("md")}
            >
              {copied === "md" ? "✓ Copied" : "Copy"}
            </button>
            <button
              className="export-btn"
              onClick={() => handleDownload("md")}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
