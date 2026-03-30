import { readFileSync, statSync } from "fs";
import { resolve, dirname, join } from "path";
import { createRequire } from "module";
import type {
  RiveFileMetadata,
  ArtboardMetadata,
  StateMachineMetadata,
  AnimationMetadata,
  SMInputMetadata,
  SMInputType,
} from "./types.js";
const require = createRequire(import.meta.url);

const RIVE_FINGERPRINT = [0x52, 0x49, 0x56, 0x45]; // "RIVE"

const SM_TYPE_NUMBER = 56;
const SM_TYPE_TRIGGER = 58;
const SM_TYPE_BOOLEAN = 59;

type RiveRuntime = {
  CustomFileAssetLoader: new (opts: {
    loadContents: () => boolean;
  }) => unknown;
  StateMachineInstance: new (
    sm: { name: string },
    ab: unknown,
  ) => {
    inputCount(): number;
    input(i: number): { name: string; type: number; value?: unknown };
    delete(): void;
  };
  load(
    data: Uint8Array,
    loader?: unknown,
    enableCDN?: boolean,
  ): Promise<{
    artboardCount(): number;
    defaultArtboard(): {
      name: string;
      delete(): void;
    } | null;
    artboardByIndex(
      i: number,
    ): {
      name: string;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      animationCount(): number;
      animationByIndex(
        i: number,
      ): { name: string; fps: number; duration: number };
      stateMachineCount(): number;
      stateMachineByIndex(i: number): { name: string };
      delete(): void;
    };
    delete(): void;
  } | null>;
};

function readVarUint(
  buf: Buffer,
  offset: number,
): { value: number; bytesRead: number } {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;
  while (true) {
    const byte = buf[offset + bytesRead];
    value |= (byte & 0x7f) << shift;
    bytesRead++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
    if (shift >= 35) break;
  }
  return { value, bytesRead };
}

function readBinaryHeader(
  buffer: Buffer,
): Pick<RiveFileMetadata, "riveVersion"> | undefined {
  if (buffer.length < 6) return undefined;
  if (!RIVE_FINGERPRINT.every((b, i) => buffer[i] === b)) return undefined;
  let offset = 4;
  const major = readVarUint(buffer, offset);
  offset += major.bytesRead;
  const minor = readVarUint(buffer, offset);
  return { riveVersion: { major: major.value, minor: minor.value } };
}

function resolveInputType(typeId: number): SMInputType {
  if (typeId === SM_TYPE_NUMBER) return "number";
  if (typeId === SM_TYPE_BOOLEAN) return "boolean";
  return "trigger";
}

let riveRuntime: RiveRuntime | null = null;

async function getRiveRuntime(): Promise<RiveRuntime> {
  if (riveRuntime) return riveRuntime;

  const g = globalThis as Record<string, unknown>;
  if (typeof globalThis.document === "undefined") {
    g.document = {
      createElement: (tag: string) => {
        if (tag === "canvas") {
          return {
            width: 1,
            height: 1,
            style: {},
            getContext: () => null,
            addEventListener: () => {},
            removeEventListener: () => {},
          };
        }
        return {};
      },
    };
  }
  if (typeof globalThis.navigator === "undefined") {
    g.navigator = { userAgent: "node" };
  }

  const canvasDir = dirname(
    require.resolve("@rive-app/canvas-advanced/package.json"),
  );
  const wasmBuffer = readFileSync(join(canvasDir, "rive.wasm"));

  const mod = await import("@rive-app/canvas-advanced");
  const RiveCanvasInit = mod.default as unknown as (
    opts?: Record<string, unknown>,
  ) => Promise<RiveRuntime>;

  riveRuntime = await RiveCanvasInit({
    instantiateWasm: (
      info: WebAssembly.Imports,
      receive: (instance: WebAssembly.Instance) => void,
    ) => {
      WebAssembly.instantiate(wasmBuffer, info).then((result) => {
        receive(result.instance);
      });
      return {};
    },
  });

  return riveRuntime;
}

async function parseWithWasm(
  buffer: Buffer,
): Promise<
  Omit<
    RiveFileMetadata,
    "filePath" | "fileSize" | "riveVersion" | "parseMethod"
  >
> {
  const rive = await getRiveRuntime();

  const assetLoader = new rive.CustomFileAssetLoader({
    loadContents: () => true,
  });

  const file = await rive.load(
    new Uint8Array(buffer),
    assetLoader,
    false,
  );

  if (!file) {
    return { artboards: [], parseError: "WASM failed to parse .riv file" };
  }

  try {
    const artboardCount = file.artboardCount();
    const defaultAb = file.defaultArtboard();
    const defaultAbName = defaultAb?.name;
    if (defaultAb) defaultAb.delete();
    const artboards: ArtboardMetadata[] = [];

    for (let i = 0; i < artboardCount; i++) {
      const ab = file.artboardByIndex(i);
      try {
        const bounds = ab.bounds;

        const animations: AnimationMetadata[] = [];
        for (let a = 0; a < ab.animationCount(); a++) {
          const anim = ab.animationByIndex(a);
          const fps = anim.fps || 60;
          const frameDuration = anim.duration || 0;
          animations.push({
            name: anim.name,
            fps,
            workDuration: frameDuration,
            duration: fps > 0 ? frameDuration / fps : 0,
          });
        }

        const stateMachines: StateMachineMetadata[] = [];
        for (let s = 0; s < ab.stateMachineCount(); s++) {
          const sm = ab.stateMachineByIndex(s);
          const inst = new rive.StateMachineInstance(sm, ab);
          try {
            const inputs: SMInputMetadata[] = [];
            for (let inp = 0; inp < inst.inputCount(); inp++) {
              const input = inst.input(inp);
              const type = resolveInputType(input.type);
              const entry: SMInputMetadata = { name: input.name, type };
              if (
                (type === "boolean" || type === "number") &&
                input.value !== undefined
              ) {
                entry.defaultValue = input.value as boolean | number;
              }
              inputs.push(entry);
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
    return { artboards };
  } catch (err) {
    try {
      file.delete();
    } catch {}
    return {
      artboards: [],
      parseError: `Failed extracting metadata: ${(err as Error).message}`,
    };
  }
}

export async function parseRiveFile(
  filePath: string,
): Promise<RiveFileMetadata> {
  const absPath = resolve(filePath);
  const buffer = readFileSync(absPath);
  const fileSize = statSync(absPath).size;
  const headerInfo = readBinaryHeader(buffer);

  if (!headerInfo) {
    return {
      filePath: absPath,
      fileSize,
      artboards: [],
      parseMethod: "binary-header",
      parseError: "Not a valid .riv file (missing RIVE fingerprint)",
    };
  }

  try {
    const wasmResult = await parseWithWasm(buffer);
    return {
      filePath: absPath,
      fileSize,
      riveVersion: headerInfo.riveVersion,
      artboards: wasmResult.artboards,
      parseMethod: "wasm",
      parseError: wasmResult.parseError,
    };
  } catch (err) {
    return {
      filePath: absPath,
      fileSize,
      riveVersion: headerInfo.riveVersion,
      artboards: [],
      parseMethod: "binary-header",
      parseError: `WASM failed: ${(err as Error).message}`,
    };
  }
}
