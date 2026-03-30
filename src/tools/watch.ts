import chokidar from "chokidar";
import { resolve } from "path";
import { parseRiveFile } from "../parser/riveParser.js";
import type {
  RiveFileMetadata,
  RiveDiff,
  DiffChange,
} from "../parser/types.js";

type FileCache = Map<string, RiveFileMetadata>;

function diffMetadata(
  prev: RiveFileMetadata,
  next: RiveFileMetadata,
): DiffChange[] {
  const changes: DiffChange[] = [];

  const prevAbs = new Set(prev.artboards.map((a) => a.name));
  const nextAbs = new Set(next.artboards.map((a) => a.name));

  for (const name of nextAbs) {
    if (!prevAbs.has(name))
      changes.push({ type: "added", category: "artboard", name });
  }
  for (const name of prevAbs) {
    if (!nextAbs.has(name))
      changes.push({ type: "removed", category: "artboard", name });
  }

  for (const nextAb of next.artboards) {
    const prevAb = prev.artboards.find((a) => a.name === nextAb.name);
    if (!prevAb) continue;

    const prevSMs = new Set(prevAb.stateMachines.map((sm) => sm.name));
    const nextSMs = new Set(nextAb.stateMachines.map((sm) => sm.name));

    for (const name of nextSMs) {
      if (!prevSMs.has(name))
        changes.push({
          type: "added",
          category: "state_machine",
          name,
          details: `in artboard '${nextAb.name}'`,
        });
    }
    for (const name of prevSMs) {
      if (!nextSMs.has(name))
        changes.push({
          type: "removed",
          category: "state_machine",
          name,
          details: `from artboard '${prevAb.name}'`,
        });
    }

    for (const nextSm of nextAb.stateMachines) {
      const prevSm = prevAb.stateMachines.find((sm) => sm.name === nextSm.name);
      if (!prevSm) continue;
      const prevInputs = new Set(prevSm.inputs.map((i) => i.name));
      const nextInputs = new Set(nextSm.inputs.map((i) => i.name));
      for (const name of nextInputs) {
        if (!prevInputs.has(name))
          changes.push({
            type: "added",
            category: "input",
            name,
            details: `in SM '${nextSm.name}'`,
          });
      }
      for (const name of prevInputs) {
        if (!nextInputs.has(name))
          changes.push({
            type: "removed",
            category: "input",
            name,
            details: `from SM '${prevSm.name}'`,
          });
      }
    }

    const prevAnims = new Set(prevAb.animations.map((a) => a.name));
    const nextAnims = new Set(nextAb.animations.map((a) => a.name));
    for (const name of nextAnims) {
      if (!prevAnims.has(name))
        changes.push({ type: "added", category: "animation", name });
    }
    for (const name of prevAnims) {
      if (!nextAnims.has(name))
        changes.push({ type: "removed", category: "animation", name });
    }
  }

  return changes;
}

export function watchRiveFiles(
  pattern: string,
  onDiff: (diff: RiveDiff) => void,
  onError?: (err: Error, filePath: string) => void,
): () => Promise<void> {
  const cache: FileCache = new Map();

  const watcher = chokidar.watch(pattern, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  const handleFile = async (filePath: string, isChange: boolean) => {
    const absPath = resolve(filePath);
    try {
      const next = await parseRiveFile(absPath);
      const prev = cache.get(absPath);
      cache.set(absPath, next);

      if (isChange && prev) {
        const changes = diffMetadata(prev, next);
        onDiff({
          filePath: absPath,
          timestamp: new Date().toISOString(),
          changes,
          hasChanges: changes.length > 0,
        });
      } else if (!isChange) {
        onDiff({
          filePath: absPath,
          timestamp: new Date().toISOString(),
          changes: [],
          hasChanges: false,
        });
      }
    } catch (err) {
      onError?.(err as Error, absPath);
    }
  };

  watcher.on("add", (path) => handleFile(path, false));
  watcher.on("change", (path) => handleFile(path, true));

  return () => watcher.close();
}

export function formatDiff(diff: RiveDiff): string {
  const lines: string[] = [];
  lines.push(
    `[${new Date(diff.timestamp).toLocaleTimeString()}] ${diff.filePath}`,
  );

  if (!diff.hasChanges) {
    lines.push("  No changes detected.");
    return lines.join("\n");
  }

  for (const change of diff.changes) {
    const icon =
      change.type === "added" ? "+" : change.type === "removed" ? "-" : "~";
    const detail = change.details ? ` (${change.details})` : "";
    lines.push(`  ${icon} [${change.category}] ${change.name}${detail}`);
  }

  return lines.join("\n");
}
