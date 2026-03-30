import { glob } from "glob";
import { resolve } from "path";
import { parseRiveFile } from "../parser/riveParser.js";
import type { ScanResult } from "../parser/types.js";

export async function scanDirectory(dirPath: string): Promise<ScanResult> {
  const absDir = resolve(dirPath);
  const pattern = `${absDir}/**/*.riv`;

  const files = await glob(pattern, { nodir: true });
  const results = await Promise.allSettled(files.map((f) => parseRiveFile(f)));

  const parsed = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          filePath: files[i],
          fileSize: 0,
          artboards: [],
          parseMethod: "binary-header" as const,
          parseError:
            (r as PromiseRejectedResult).reason?.message ?? "unknown error",
        },
  );

  const failedFiles = parsed
    .filter((f) => f.parseError && f.artboards.length === 0)
    .map((f) => f.filePath);

  const uniqueArtboards = [
    ...new Set(parsed.flatMap((f) => f.artboards.map((a) => a.name))),
  ];

  const uniqueStateMachines = [
    ...new Set(
      parsed.flatMap((f) =>
        f.artboards.flatMap((a) => a.stateMachines.map((sm) => sm.name)),
      ),
    ),
  ];

  const totalAnimations = parsed.reduce(
    (sum, f) => sum + f.artboards.reduce((s, a) => s + a.animations.length, 0),
    0,
  );

  return {
    directory: absDir,
    totalFiles: files.length,
    files: parsed,
    summary: {
      uniqueArtboards,
      uniqueStateMachines,
      totalAnimations,
      failedFiles,
    },
  };
}

export function formatScanOutput(result: ScanResult): string {
  const lines: string[] = [];
  lines.push(`Scanned: ${result.directory}`);
  lines.push(`Found: ${result.totalFiles} .riv file(s)`);
  lines.push("");

  for (const f of result.files) {
    const kb = (f.fileSize / 1024).toFixed(1);
    const status = f.parseError ? "✗" : "✓";
    lines.push(
      `${status} ${f.filePath.replace(result.directory + "/", "")} (${kb} KB)`,
    );
    if (f.parseError) {
      lines.push(`  Error: ${f.parseError}`);
    } else {
      for (const ab of f.artboards) {
        const sms = ab.stateMachines.map((sm) => sm.name).join(", ");
        lines.push(
          `  ${ab.isDefault ? "★" : "○"} ${ab.name} — SM: [${sms || "none"}]`,
        );
      }
    }
  }

  lines.push("");
  lines.push("Summary:");
  lines.push(
    `  Unique artboards: ${result.summary.uniqueArtboards.join(", ") || "none"}`,
  );
  lines.push(
    `  Unique state machines: ${result.summary.uniqueStateMachines.join(", ") || "none"}`,
  );
  lines.push(`  Total animations: ${result.summary.totalAnimations}`);
  if (result.summary.failedFiles.length > 0) {
    lines.push(`  Failed: ${result.summary.failedFiles.length} file(s)`);
  }

  return lines.join("\n");
}
