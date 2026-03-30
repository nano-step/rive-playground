import { readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { createRequire } from "module";
import type {
  RiveFieldsExport,
  SMInputMetadata,
  SMInputType,
} from "../parser/types.js";

const require = createRequire(import.meta.url);

const SM_TYPE_NUMBER = 56;
const SM_TYPE_BOOLEAN = 59;

type RiveAny = Record<string, unknown>;

type RiveRuntime = {
  CustomFileAssetLoader: new (opts: {
    loadContents: () => boolean;
  }) => unknown;
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
    artboardByIndex(i: number): RiveAny;
    delete(): void;
  } | null>;
};

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

function resolveInputType(typeId: number): SMInputType {
  if (typeId === SM_TYPE_NUMBER) return "number";
  if (typeId === SM_TYPE_BOOLEAN) return "boolean";
  return "trigger";
}

export async function exportFields(
  filePath: string,
): Promise<RiveFieldsExport> {
  const absPath = resolve(filePath);
  const rive = await getRiveRuntime();

  const assetLoader = new rive.CustomFileAssetLoader({
    loadContents: () => true,
  });

  const buffer = readFileSync(absPath);
  const file = await rive.load(new Uint8Array(buffer), assetLoader, false);

  if (!file) {
    return {
      filePath: absPath,
      artboards: [],
      viewModels: [],
      dataEnums: [],
      parseError: "WASM failed to parse .riv file",
    };
  }

  try {
    const result: RiveFieldsExport = {
      filePath: absPath,
      artboards: [],
      viewModels: [],
      dataEnums: [],
    };

    for (let i = 0; i < file.artboardCount(); i++) {
      const ab = file.artboardByIndex(i) as RiveAny;
      try {
        const abName = ab["name"] as string;
        const animCount =
          (ab["animationCount"] as (() => number) | undefined)?.() ?? 0;
        const smCount =
          (ab["stateMachineCount"] as (() => number) | undefined)?.() ?? 0;

        const animations: string[] = [];
        for (let a = 0; a < animCount; a++) {
          const anim = (
            ab["animationByIndex"] as ((i: number) => RiveAny) | undefined
          )?.(a);
          if (anim) animations.push(anim["name"] as string);
        }

        const stateMachines: Array<{
          name: string;
          inputs: SMInputMetadata[];
        }> = [];
        for (let s = 0; s < smCount; s++) {
          const sm = (
            ab["stateMachineByIndex"] as
              | ((i: number) => { name: string })
              | undefined
          )?.(s);
          if (!sm) continue;

          const inst = new rive.StateMachineInstance(sm, ab);
          try {
            const inputs: SMInputMetadata[] = [];
            for (let inp = 0; inp < inst.inputCount(); inp++) {
              const input = inst.input(inp);
              const type = resolveInputType(input.type);
              inputs.push({ name: input.name, type });
            }
            stateMachines.push({ name: sm.name, inputs });
          } finally {
            inst.delete();
          }
        }

        result.artboards.push({ name: abName, animations, stateMachines });
      } finally {
        (ab["delete"] as (() => void) | undefined)?.();
      }
    }

    file.delete();
    return result;
  } catch (err) {
    try {
      file.delete();
    } catch {}
    return {
      filePath: absPath,
      artboards: [],
      viewModels: [],
      dataEnums: [],
      parseError: `Extraction error: ${(err as Error).message}`,
    };
  }
}

export function formatFieldsOutput(result: RiveFieldsExport): string {
  const lines: string[] = [];
  lines.push(`File: ${result.filePath}`);
  if (result.parseError) lines.push(`Warning: ${result.parseError}`);
  lines.push("");

  lines.push(`Artboards (${result.artboards.length}):`);
  for (const ab of result.artboards) {
    lines.push(`  ${ab.name}`);
    if (ab.animations.length > 0) {
      lines.push(`    Animations: ${ab.animations.join(", ")}`);
    }
    for (const sm of ab.stateMachines) {
      lines.push(`    SM: ${sm.name}`);
      for (const inp of sm.inputs) {
        lines.push(`      [${inp.type}] ${inp.name}`);
      }
    }
  }

  if (result.viewModels.length > 0) {
    lines.push("");
    lines.push(`ViewModels (${result.viewModels.length}):`);
    for (const vm of result.viewModels) {
      lines.push(`  ${vm.name}`);
      if (vm.instanceNames.length > 0) {
        lines.push(
          `    Instances: ${vm.instanceNames.filter(Boolean).join(", ") || "(default)"}`,
        );
      }
      if (vm.properties.length > 0) {
        lines.push(`    Properties (${vm.properties.length}):`);
        for (const prop of vm.properties) {
          const defStr =
            prop.defaultValue !== undefined
              ? ` = ${JSON.stringify(prop.defaultValue)}`
              : "";
          lines.push(`      [${prop.type}] ${prop.name}${defStr}`);
        }
      }
      if (vm.enums.length > 0) {
        lines.push(`    Enums:`);
        for (const en of vm.enums) {
          lines.push(
            `      ${en.name}: ${en.values.join(" | ")} (current: ${en.currentValue})`,
          );
        }
      }
    }
  }

  if (result.dataEnums.length > 0) {
    lines.push("");
    lines.push(`Data Enums (${result.dataEnums.length}):`);
    for (const en of result.dataEnums) {
      lines.push(`  ${en.name}: ${en.values.join(" | ")}`);
    }
  }

  return lines.join("\n");
}
