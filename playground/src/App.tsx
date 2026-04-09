import { useCallback, useState, useEffect } from "react";
import { useRivePlayground } from "./hooks/useRivePlayground";
import { usePresets } from "./hooks/usePresets";
import { FileLoader } from "./components/FileLoader";
import { FileOpener } from "./components/FileOpener";
import { RiveCanvas } from "./components/RiveCanvas";
import { Sidebar } from "./components/Sidebar";
import { PlaybackPanel } from "./components/panels/PlaybackPanel";
import { Toast } from "./components/Toast";


import "./App.css";

export default function App() {
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const {
    state,
    riveSource,
    riveKey,
    metadataReady,
    onRiveReady,
    loadFromBuffer,
    loadFromUrl,
    selectArtboard,
    selectStateMachine,
    setSMInputValue,
    fireSMTrigger,
    setViewModelProp,
    performListAction,
    setTextRunValue,
    addTextRunName,
    playAnimation,
    pauseAnimation,
    resetAnimation,
    clearEvents,
    applyPreset,
  } = useRivePlayground();

  const handleListAction = useCallback(
    (action: Parameters<typeof performListAction>[0]) => {
      performListAction(action, state.viewModelProps);
    },
    [performListAction, state.viewModelProps],
  );

  const { presets, savePreset, deletePreset } = usePresets();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fileUrl = params.get("file");
    if (fileUrl) loadFromUrl(fileUrl);
  }, [loadFromUrl]);

  useEffect(() => {
    if (!state.isLoaded) return;
    const url = new URL(window.location.href);
    if (state.selectedArtboard) url.searchParams.set("artboard", state.selectedArtboard);
    if (state.selectedStateMachine) url.searchParams.set("sm", state.selectedStateMachine);
    window.history.replaceState(null, "", url.toString());
  }, [state.isLoaded, state.selectedArtboard, state.selectedStateMachine]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!state.isLoaded) return;
      if (e.code === "Space") { e.preventDefault(); playAnimation(); }
      if (e.code === "KeyR" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); resetAnimation(); }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyS") {
        e.preventDefault();
        const name = `Preset ${presets.length + 1}`;
        savePreset(name, state);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, presets.length, playAnimation, resetAnimation, savePreset]);

  const showWelcome = !state.isLoaded && !state.isLoading && !state.fileName;

  const [isDraggingOnCanvas, setIsDraggingOnCanvas] = useState(false);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOnCanvas(true);
  }, []);

  const handleCanvasDragLeave = useCallback(() => {
    setIsDraggingOnCanvas(false);
  }, []);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOnCanvas(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".riv")) {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            loadFromBuffer(reader.result, file.name);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    },
    [loadFromBuffer],
  );

  const toastMessage = state.error && state.error !== dismissedError ? state.error : null;

  return (
    <div className="app">
      <Toast
        message={toastMessage}
        type="error"
        onDismiss={() => setDismissedError(state.error)}
      />
      {showWelcome ? (
        <div className="welcome-screen">
          <div className="welcome-card">
            <div className="welcome-brand">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} className="welcome-logo" alt="Rive Playground" />
              <h1 className="welcome-title">Rive Playground</h1>
              <p className="welcome-subtitle">
                Inspect, control, and export Rive animations in real-time
              </p>
            </div>
            <FileLoader
              onLoadBuffer={loadFromBuffer}
              onLoadUrl={loadFromUrl}
              isLoading={state.isLoading}
            />
          </div>
        </div>
      ) : (
        <>
          <header className="app-header">
            <h1 className="app-title">Rive Playground</h1>
            {state.fileName && (
              <FileOpener
                fileName={state.fileName}
                onLoadBuffer={loadFromBuffer}
                onLoadUrl={loadFromUrl}
                isLoading={state.isLoading}
              />
            )}
          </header>

          <main className="app-main">
            <div
              className={`canvas-area fade-in ${isDraggingOnCanvas ? "canvas-drag-over" : ""}`}
              onDragOver={handleCanvasDragOver}
              onDragLeave={handleCanvasDragLeave}
              onDrop={handleCanvasDrop}
            >
              {riveSource && metadataReady && (
                <RiveCanvas
                  key={riveKey}
                  buffer={riveSource.buffer}
                  src={riveSource.src}
                  artboard={state.selectedArtboard}
                  stateMachine={state.selectedStateMachine}
                  onRiveReady={onRiveReady}
                />
              )}

              {state.isLoading && (
                <div className="loading-overlay">
                  <div className="spinner" />
                </div>
              )}

              {isDraggingOnCanvas && (
                <div className="canvas-drop-hint">
                  <div className="canvas-drop-hint-content">
                    Drop .riv file to preview
                  </div>
                </div>
              )}

              <PlaybackPanel
                isLoaded={state.isLoaded}
                onPlay={playAnimation}
                onPause={pauseAnimation}
                onReset={resetAnimation}
              />
            </div>

            <Sidebar
              state={state}
              onSelectArtboard={selectArtboard}
              onSelectSM={selectStateMachine}
              onSetInput={setSMInputValue}
              onFireTrigger={fireSMTrigger}
              onSetViewModelProp={setViewModelProp}
              onListAction={handleListAction}
              onSetTextRun={setTextRunValue}
              onAddTextRun={addTextRunName}
              onClearEvents={clearEvents}
              presets={presets}
              onSavePreset={(name) => savePreset(name, state)}
              onApplyPreset={applyPreset}
              onDeletePreset={deletePreset}
            />
          </main>
        </>
      )}
    </div>
  );
}
