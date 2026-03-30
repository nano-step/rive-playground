import type { PlaygroundState } from "../types";
import { ArtboardPanel } from "./panels/ArtboardPanel";
import { StateMachinePanel } from "./panels/StateMachinePanel";
import { TextRunPanel } from "./panels/TextRunPanel";
import { ViewModelPanel } from "./panels/ViewModelPanel";
import { ExportPanel } from "./panels/ExportPanel";

interface Props {
  state: PlaygroundState;
  onSelectArtboard: (name: string) => void;
  onSelectSM: (name: string) => void;
  onSetInput: (name: string, value: number | boolean) => void;
  onFireTrigger: (name: string) => void;
  onSetViewModelProp: (path: string, type: string, value: string | number | boolean | ArrayBuffer) => void;
  onSetTextRun: (name: string, value: string) => void;
  onAddTextRun: (name: string) => void;
}

function SkeletonPanel() {
  return (
    <div className="skeleton-panel">
      <div className="skeleton-bar w-1-3 h-8" />
      <div className="skeleton-bar w-full h-28" />
      <div className="skeleton-row">
        <div className="skeleton-bar w-1-3 h-8" />
        <div className="skeleton-bar w-1-2 h-8" />
      </div>
      <div className="skeleton-row">
        <div className="skeleton-bar w-1-2 h-8" />
        <div className="skeleton-bar w-1-3 h-8" />
      </div>
    </div>
  );
}

export function Sidebar({
  state,
  onSelectArtboard,
  onSelectSM,
  onSetInput,
  onFireTrigger,
  onSetViewModelProp,
  onSetTextRun,
  onAddTextRun,
}: Props) {
  if (!state.isLoaded && !state.isLoading) return null;

  const metadataLoading = state.artboards.length === 0;

  return (
    <aside className="sidebar fade-in">
      <div className="sidebar-header">
        <span className="sidebar-title">Inspector</span>
        <span className="sidebar-file">{state.fileName}</span>
      </div>
      <div className="sidebar-scroll">
        {metadataLoading ? (
          <>
            <SkeletonPanel />
            <SkeletonPanel />
            <SkeletonPanel />
          </>
        ) : (
          <>
            <ArtboardPanel
              artboards={state.artboards}
              selectedArtboard={state.selectedArtboard}
              selectedAnimation={state.selectedAnimation}
              onSelectArtboard={onSelectArtboard}
            />
            <StateMachinePanel
              artboards={state.artboards}
              selectedArtboard={state.selectedArtboard}
              selectedStateMachine={state.selectedStateMachine}
              smInputs={state.smInputs}
              onSelectSM={onSelectSM}
              onSetInput={onSetInput}
              onFireTrigger={onFireTrigger}
            />
            <TextRunPanel
              textRuns={state.textRuns}
              onSetTextRun={onSetTextRun}
              onAddTextRun={onAddTextRun}
            />
            <ViewModelPanel properties={state.viewModelProps} onSetProp={onSetViewModelProp} />
            <ExportPanel state={state} />
          </>
        )}
      </div>
    </aside>
  );
}
