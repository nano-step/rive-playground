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
}

export const SM_INPUT_NUMBER = 56;
export const SM_INPUT_TRIGGER = 58;
export const SM_INPUT_BOOLEAN = 59;
