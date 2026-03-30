import { useCallback, useState } from "react";
import { useRivePlayground } from "./hooks/useRivePlayground";
import { FileLoader } from "./components/FileLoader";
import { RiveCanvas } from "./components/RiveCanvas";
import { Sidebar } from "./components/Sidebar";
import { PlaybackPanel } from "./components/panels/PlaybackPanel";
import "./App.css";

export default function App() {
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
    setTextRunValue,
    addTextRunName,
    playAnimation,
    pauseAnimation,
    resetAnimation,
  } = useRivePlayground();

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

  return (
    <div className="app">
      {showWelcome ? (
        <div className="welcome-screen">
          <div className="welcome-card">
            <div className="welcome-brand">
              <div className="welcome-logo" />
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
            {state.isLoaded && (
              <div className="header-loader">
                <FileLoader
                  onLoadBuffer={loadFromBuffer}
                  onLoadUrl={loadFromUrl}
                  isLoading={state.isLoading}
                />
              </div>
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
            onSetTextRun={setTextRunValue}
            onAddTextRun={addTextRunName}
            />
          </main>
        </>
      )}
    </div>
  );
}
