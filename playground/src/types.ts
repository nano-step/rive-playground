export interface AnimationInfo {
  name: string;
  fps: number;
  duration: number;
  frameDuration: number;
}

export interface StateMachineInfo {
  name: string;
  inputs: Array<{ name: string; type: number }>;
}

export interface ArtboardInfo {
  name: string;
  width: number;
  height: number;
  isDefault: boolean;
  animations: AnimationInfo[];
  stateMachines: StateMachineInfo[];
}

export interface SMInput {
  name: string;
  type: number;
  value?: number | boolean;
  fire?: () => void;
}

export interface TextRunEntry {
  name: string;
  value: string;
}

export interface ViewModelProperty {
  name: string;
  type: string;
  path: string;
  value?: string | number | boolean;
  enumValues?: string[];
  imageUrl?: string;
  children?: ViewModelProperty[];
  listItemType?: string;
}

export type ListAction =
  | { action: "add"; listPath: string }
  | { action: "remove"; listPath: string; index: number }
  | { action: "swap"; listPath: string; indexA: number; indexB: number };

export interface RiveEvent {
  id: number;
  timestamp: string;
  name: string;
  type: "general" | "openUrl";
  properties?: Record<string, unknown>;
  url?: string;
}

export interface Preset {
  id: string;
  name: string;
  artboard: string;
  stateMachine: string;
  inputs: Array<{ name: string; type: string; value: unknown }>;
  viewModelProps: Array<{ path: string; type: string; value: unknown }>;
  textRuns: Array<{ name: string; value: string }>;
  createdAt: string;
}

export interface PlaygroundState {
  isLoaded: boolean;
  isLoading: boolean;
  fileName: string;
  error: string | null;
  artboards: ArtboardInfo[];
  selectedArtboard: string;
  selectedStateMachine: string;
  selectedAnimation: string;
  smInputs: SMInput[];
  textRuns: TextRunEntry[];
  viewModelProps: ViewModelProperty[];
  riveEvents: RiveEvent[];
}

export const SM_INPUT_NUMBER = 56;
export const SM_INPUT_TRIGGER = 58;
export const SM_INPUT_BOOLEAN = 59;
