import type {
  AppVersion,
  AppVersionValidationResult,
  IAppVersionValidator,
} from "@smartsaude/shared";

function compareVersions(left: AppVersion, right: AppVersion): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export class MockAppVersionValidator implements IAppVersionValidator {
  constructor(private readonly minimumVersion: AppVersion) {}

  async validarVersaoLocal(
    localVersion: AppVersion,
  ): Promise<AppVersionValidationResult> {
    return Promise.resolve({
      versaoLocal: localVersion,
      versaoMinimaObrigatoria: this.minimumVersion,
      status:
        compareVersions(localVersion, this.minimumVersion) < 0
          ? "atualizacao_obrigatoria"
          : "compativel",
    });
  }
}
