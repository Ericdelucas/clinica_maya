import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

interface RootPackageJson {
  readonly config?: {
    readonly versionBase?: string;
  };
}

const repositoryRoot = resolve(__dirname, "../..");

async function writeJson(
  relativePath: string,
  value: Readonly<Record<string, string | number>>,
): Promise<void> {
  const target = resolve(repositoryRoot, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function injectVersion(): Promise<void> {
  const packageJson = JSON.parse(
    await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
  ) as RootPackageJson;
  const versionBase = packageJson.config?.versionBase;

  if (!versionBase || !/^\d+\.\d{2}$/.test(versionBase)) {
    throw new Error(
      'Defina "config.versionBase" no package.json no formato "0.01".',
    );
  }

  const commitCount = Number.parseInt(
    execSync("git rev-list --count HEAD", {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim(),
    10,
  );

  if (!Number.isSafeInteger(commitCount) || commitCount < 0) {
    throw new Error(`Contagem de commits inválida: ${commitCount}`);
  }

  const version = `${versionBase}.${String(commitCount).padStart(3, "0")}`;
  const versionDocument = {
    version,
    base: versionBase,
    commitCount,
  } as const;

  await Promise.all([
    writeJson(
      "packages/shared/src/domain/config/version.json",
      versionDocument,
    ),
    writeJson("apps/web/public/app-version.json", versionDocument),
    writeJson("apps/desktop/app-version.json", versionDocument),
  ]);

  await writeFile(
    resolve(repositoryRoot, "apps/web/src/generated/appVersion.ts"),
    [
      'import type { AppVersion } from "@smartsaude/shared";',
      "",
      "/** Gerado automaticamente por pipeline/inject-version.ts. */",
      `export const APP_VERSION: AppVersion = "${version}";`,
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`SmartSaúde ${version} (${commitCount} commits)`);
}

void injectVersion().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
