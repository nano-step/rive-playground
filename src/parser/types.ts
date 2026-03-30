// ─────────────────────────────────────────────────────────────────────────────
// Rive MCP Analyzer — Shared Types
// ─────────────────────────────────────────────────────────────────────────────

export type SMInputType = "boolean" | "number" | "trigger";

export interface SMInputMetadata {
  name: string;
  type: SMInputType;
  defaultValue?: boolean | number;
}

export interface StateMachineMetadata {
  name: string;
  inputs: SMInputMetadata[];
}

export interface AnimationMetadata {
  name: string;
  duration: number; // seconds
  fps: number;
  workDuration: number; // frames
}

export interface ArtboardMetadata {
  name: string;
  width: number;
  height: number;
  isDefault: boolean;
  animations: AnimationMetadata[];
  stateMachines: StateMachineMetadata[];
}

export interface RiveFileMetadata {
  filePath: string;
  fileSize: number; // bytes
  riveVersion?: { major: number; minor: number };
  artboards: ArtboardMetadata[];
  parseMethod: "wasm" | "binary-header";
  parseError?: string;
}

// ─── Scan ────────────────────────────────────────────────────────────────────

export interface ScanResult {
  directory: string;
  totalFiles: number;
  files: RiveFileMetadata[];
  summary: {
    uniqueArtboards: string[];
    uniqueStateMachines: string[];
    totalAnimations: number;
    failedFiles: string[];
  };
}

// ─── Validate ────────────────────────────────────────────────────────────────

export type ValidationStatus =
  | "match"
  | "missing_in_riv"
  | "extra_in_config"
  | "ok";

export interface ValidationItem {
  value: string;
  status: ValidationStatus;
  location?: string; // which artboard/sm contains it
}

export interface ValidationResult {
  rivFile: string;
  configFile: string;
  artboardChecks: ValidationItem[];
  stateMachineChecks: ValidationItem[];
  inputChecks: ValidationItem[];
  isValid: boolean;
  summary: string;
}

// ─── Diff (for watch mode) ───────────────────────────────────────────────────

export interface RiveDiff {
  filePath: string;
  timestamp: string;
  changes: DiffChange[];
  hasChanges: boolean;
}

export interface DiffChange {
  type: "added" | "removed" | "modified";
  category: "artboard" | "state_machine" | "input" | "animation";
  name: string;
  details?: string;
}

// ─── Export Fields ───────────────────────────────────────────────────────────

export type RiveFieldType =
  | "string"
  | "number"
  | "boolean"
  | "color"
  | "trigger"
  | "enumType"
  | "list"
  | "image"
  | "artboard"
  | "viewModel"
  | "integer"
  | "listIndex"
  | "none";

export interface ViewModelPropertyMetadata {
  name: string;
  type: RiveFieldType;
  defaultValue?: string | number | boolean;
}

export interface EnumMetadata {
  name: string;
  currentValue: string;
  values: string[];
}

export interface ViewModelMetadata {
  name: string;
  instanceNames: string[];
  properties: ViewModelPropertyMetadata[];
  enums: EnumMetadata[];
}

export interface RiveFieldsExport {
  filePath: string;
  artboards: Array<{
    name: string;
    animations: string[];
    stateMachines: Array<{
      name: string;
      inputs: SMInputMetadata[];
    }>;
  }>;
  viewModels: ViewModelMetadata[];
  dataEnums: EnumMetadata[];
  parseError?: string;
}
