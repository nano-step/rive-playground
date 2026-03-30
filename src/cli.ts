#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";

import { inspectRive, formatInspectOutput } from "./tools/inspect.js";
import { scanDirectory, formatScanOutput } from "./tools/scan.js";
import { validateConfig, formatValidateOutput } from "./tools/validate.js";
import { generateTypes } from "./tools/generateTypes.js";
import { watchRiveFiles, formatDiff } from "./tools/watch.js";
import { exportFields, formatFieldsOutput } from "./tools/exportFields.js";

const program = new Command();

program
  .name("rive-analyzer")
  .description(
    "Inspect, validate, and generate types from Rive .riv animation files",
  )
  .version("1.0.0");

program
  .command("inspect <rivFile>")
  .description(
    "Parse a .riv file and show all artboards, state machines, and animations",
  )
  .option("--json", "Output raw JSON")
  .action(async (rivFile: string, opts: { json?: boolean }) => {
    try {
      const meta = await inspectRive(rivFile);
      if (opts.json) {
        console.log(JSON.stringify(meta, null, 2));
      } else {
        console.log(formatInspectOutput(meta));
        if (meta.parseError) {
          console.log(chalk.yellow(`\nWarning: ${meta.parseError}`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("scan <directory>")
  .description("Recursively scan a directory for all .riv files")
  .option("--json", "Output raw JSON")
  .action(async (directory: string, opts: { json?: boolean }) => {
    try {
      const result = await scanDirectory(directory);
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatScanOutput(result));
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("validate <rivFile> <configFile>")
  .description("Compare .riv metadata against a JS/TS constants file")
  .option("--json", "Output raw JSON")
  .action(
    async (rivFile: string, configFile: string, opts: { json?: boolean }) => {
      try {
        const result = await validateConfig(rivFile, configFile);
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatValidateOutput(result));
        }
        if (!result.isValid) process.exit(1);
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    },
  );

program
  .command("generate-types <rivFile>")
  .description("Generate TypeScript type constants from .riv metadata")
  .option("-o, --output <file>", "Write to file instead of stdout")
  .action(async (rivFile: string, opts: { output?: string }) => {
    try {
      const output = await generateTypes(rivFile, opts.output);
      if (opts.output) {
        console.log(chalk.green(`✓ Types written to ${opts.output}`));
      } else {
        console.log(output);
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("export-fields <rivFile>")
  .description(
    "Export all fields: artboards, ViewModels, enums, properties with default values",
  )
  .option("--json", "Output raw JSON")
  .action(async (rivFile: string, opts: { json?: boolean }) => {
    try {
      const result = await exportFields(rivFile);
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatFieldsOutput(result));
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("watch <pattern>")
  .description("Watch .riv files for changes and show diffs (Ctrl+C to stop)")
  .action(async (pattern: string) => {
    console.log(chalk.cyan(`Watching: ${pattern}`));
    console.log(chalk.gray("Press Ctrl+C to stop\n"));

    const stopWatch = watchRiveFiles(
      pattern,
      (diff) => {
        const output = formatDiff(diff);
        if (diff.hasChanges) {
          console.log(chalk.yellow(output));
        } else {
          console.log(chalk.gray(output));
        }
      },
      (err, filePath) => {
        console.error(chalk.red(`Error watching ${filePath}: ${err.message}`));
      },
    );

    process.on("SIGINT", async () => {
      console.log(chalk.gray("\nStopping watcher..."));
      await stopWatch();
      process.exit(0);
    });
  });

program.parse();
