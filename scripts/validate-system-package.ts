import { formatSystemPackageValidationReport, systemPackageValidationExitCode, validateSystemPackagePath } from "./system-package-validator-lib";

const args = process.argv.slice(2);
const json = args.includes("--json");
const inputPath = args.find((argument) => argument !== "--json");

if (!inputPath) {
  console.error("Usage: npm run validate:system-package -- <directory|package.zip> [-- --json]");
  process.exitCode = 2;
} else {
  try {
    const report = await validateSystemPackagePath(inputPath);
    process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : formatSystemPackageValidationReport(report));
    process.exitCode = systemPackageValidationExitCode(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (json) process.stdout.write(`${JSON.stringify({ path: inputPath, ok: false, issues: [{ level: "fatal", code: "CLI_INPUT_ERROR", text: message }] }, null, 2)}\n`);
    else console.error(`FAIL ${inputPath}\n[FATAL] CLI_INPUT_ERROR: ${message}`);
    process.exitCode = 2;
  }
}
