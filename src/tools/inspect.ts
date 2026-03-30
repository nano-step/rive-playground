import { parseRiveFile } from "../parser/riveParser.js";
import type { RiveFileMetadata } from "../parser/types.js";

export async function inspectRive(filePath: string): Promise<RiveFileMetadata> {
  return parseRiveFile(filePath);
}

export function formatInspectOutput(meta: RiveFileMetadata): string {
  const lines: string[] = [];
  const kb = (meta.fileSize / 1024).toFixed(1);

  lines.push(`File: ${meta.filePath}`);
  lines.push(`Size: ${kb} KB`);
  if (meta.riveVersion) {
    lines.push(
      `Rive version: ${meta.riveVersion.major}.${meta.riveVersion.minor}`,
    );
  }
  lines.push(`Parse method: ${meta.parseMethod}`);
  if (meta.parseError) {
    lines.push(`Warning: ${meta.parseError}`);
  }
  lines.push("");
  lines.push(`Artboards (${meta.artboards.length}):`);

  for (const ab of meta.artboards) {
    lines.push(
      `  ${ab.isDefault ? "★" : "○"} ${ab.name} (${ab.width}×${ab.height})`,
    );

    if (ab.animations.length > 0) {
      lines.push(`    Animations (${ab.animations.length}):`);
      for (const anim of ab.animations) {
        lines.push(
          `      - ${anim.name} (${anim.duration.toFixed(2)}s @ ${anim.fps}fps)`,
        );
      }
    }

    if (ab.stateMachines.length > 0) {
      lines.push(`    State Machines (${ab.stateMachines.length}):`);
      for (const sm of ab.stateMachines) {
        lines.push(`      - ${sm.name}`);
        for (const input of sm.inputs) {
          const defaultStr =
            input.defaultValue !== undefined ? ` = ${input.defaultValue}` : "";
          lines.push(`          [${input.type}] ${input.name}${defaultStr}`);
        }
      }
    }
  }

  return lines.join("\n");
}
