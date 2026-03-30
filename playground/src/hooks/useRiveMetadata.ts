import { useState, useEffect } from "react";
import type { ArtboardInfo, AnimationInfo, StateMachineInfo } from "../types";

type RiveRuntime = {
  CustomFileAssetLoader: new (opts: { loadContents: () => boolean }) => unknown;
  StateMachineInstance: new (
    sm: { name: string },
    ab: unknown,
  ) => {
    inputCount(): number;
    input(i: number): { name: string; type: number };
    delete(): void;
  };
  load(
    data: Uint8Array,
    loader?: unknown,
    enableCDN?: boolean,
  ): Promise<{
    artboardCount(): number;
    defaultArtboard(): { name: string; delete(): void } | null;
    artboardByIndex(i: number): {
      name: string;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      animationCount(): number;
      animationByIndex(i: number): {
        name: string;
        fps: number;
        duration: number;
      };
      stateMachineCount(): number;
      stateMachineByIndex(i: number): { name: string };
      delete(): void;
    };
    delete(): void;
  } | null>;
};

let riveRuntime: RiveRuntime | null = null;

async function getRiveRuntime(): Promise<RiveRuntime> {
  if (riveRuntime) return riveRuntime;

  const [mod, wasmUrlMod] = await Promise.all([
    import("@rive-app/canvas-advanced"),
    import("@rive-app/canvas-advanced/rive.wasm?url"),
  ]);

  const RiveCanvasInit = mod.default as unknown as (
    opts?: Record<string, unknown>,
  ) => Promise<RiveRuntime>;

  riveRuntime = await RiveCanvasInit({
    locateFile: () => wasmUrlMod.default as string,
  });

  return riveRuntime;
}

async function extractMetadataFromBuffer(
  buffer: ArrayBuffer,
): Promise<ArtboardInfo[]> {
  const rive = await getRiveRuntime();
  const assetLoader = new rive.CustomFileAssetLoader({
    loadContents: () => true,
  });

  const file = await rive.load(new Uint8Array(buffer), assetLoader, false);
  if (!file) return [];

  try {
    const defaultAb = file.defaultArtboard();
    const defaultAbName = defaultAb?.name;
    if (defaultAb) defaultAb.delete();

    const artboards: ArtboardInfo[] = [];

    for (let i = 0; i < file.artboardCount(); i++) {
      const ab = file.artboardByIndex(i);
      try {
        const bounds = ab.bounds;

        const animations: AnimationInfo[] = [];
        for (let a = 0; a < ab.animationCount(); a++) {
          const anim = ab.animationByIndex(a);
          const fps = anim.fps || 60;
          const frameDuration = anim.duration || 0;
          animations.push({
            name: anim.name,
            fps,
            frameDuration,
            duration: fps > 0 ? frameDuration / fps : 0,
          });
        }

        const stateMachines: StateMachineInfo[] = [];
        for (let s = 0; s < ab.stateMachineCount(); s++) {
          const sm = ab.stateMachineByIndex(s);
          const inst = new rive.StateMachineInstance(sm, ab);
          try {
            const inputs: Array<{ name: string; type: number }> = [];
            for (let inp = 0; inp < inst.inputCount(); inp++) {
              const input = inst.input(inp);
              inputs.push({ name: input.name, type: input.type });
            }
            stateMachines.push({ name: sm.name, inputs });
          } finally {
            inst.delete();
          }
        }

        artboards.push({
          name: ab.name,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY,
          isDefault: ab.name === defaultAbName,
          animations,
          stateMachines,
        });
      } finally {
        ab.delete();
      }
    }

    file.delete();
    return artboards;
  } catch {
    try {
      file.delete();
    } catch {}
    return [];
  }
}

export function useRiveMetadata(buffer: ArrayBuffer | null): ArtboardInfo[] {
  const [artboards, setArtboards] = useState<ArtboardInfo[]>([]);

  useEffect(() => {
    if (!buffer) {
      setArtboards([]);
      return;
    }
    let cancelled = false;
    extractMetadataFromBuffer(buffer)
      .then((result) => {
        if (!cancelled) setArtboards(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [buffer]);

  return artboards;
}
