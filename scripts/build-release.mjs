import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const sourceCommit = process.env.GITHUB_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error("source commit must be a full SHA");

const outputDirectory = process.env.RELEASE_OUTPUT_DIR ?? "dist-release";
mkdirSync(outputDirectory, { recursive: true });
const npmOutput = execFileSync("npm", ["pack", "--pack-destination", outputDirectory], { encoding: "utf8" }).trim();
const artifact = basename(npmOutput.split("\n").at(-1));
const digest = createHash("sha256").update(readFileSync(join(outputDirectory, artifact))).digest("hex");
const releaseBase = `plunk-agent-cli-${packageJson.version}`;

writeFileSync(join(outputDirectory, `${artifact}.sha256`), `${digest}  ${artifact}\n`);
writeFileSync(
  join(outputDirectory, `${releaseBase}.release.json`),
  `${JSON.stringify({ schema_version: 1, repository: "ContextNine/plunk-agent-cli", version: packageJson.version, source_commit: sourceCommit, artifact, sha256: digest }, null, 2)}\n`,
);
