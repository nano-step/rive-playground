import { useEffect, useCallback, useRef, useState } from "react";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import type { Rive } from "@rive-app/react-canvas";

interface Props {
  buffer?: ArrayBuffer;
  src?: string;
  artboard?: string;
  stateMachine?: string;
  onRiveReady: (rive: Rive) => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

export function RiveCanvas({
  buffer,
  src,
  artboard,
  stateMachine,
  onRiveReady,
}: Props) {
  const params = {
    ...(buffer ? { buffer } : { src }),
    artboard: artboard || undefined,
    stateMachines: stateMachine ? [stateMachine] : undefined,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  };

  const { rive, RiveComponent } = useRive(params, {
    fitCanvasToArtboardHeight: false,
    useDevicePixelRatio: true,
  });

  const stableOnReady = useCallback(onRiveReady, [onRiveReady]);

  useEffect(() => {
    if (rive) {
      stableOnReady(rive);
    }
  }, [rive, stableOnReady]);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (!isPanning) return;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    };

    const onUp = () => setIsPanning(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isPanning]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      e.stopPropagation();
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setIsPanning(true);
    }
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.altKey) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, []);

  return (
    <div
      ref={viewportRef}
      className={`rive-viewport ${isPanning ? "panning" : ""}`}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="rive-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          pointerEvents: isPanning ? "none" : "auto",
        }}
      >
        <RiveComponent className="rive-canvas" />
      </div>
      {zoom !== 1 && (
        <div className="zoom-indicator">{Math.round(zoom * 100)}%</div>
      )}
    </div>
  );
}
