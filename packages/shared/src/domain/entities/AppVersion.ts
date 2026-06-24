/**
 * Versão pública do aplicativo no formato X.YY.ZZZ.
 *
 * O template literal garante três segmentos numéricos em tempo de compilação.
 * A regra de largura de cada segmento deve ser validada na borda de entrada.
 */
export type AppVersion = `${number}.${number}.${number}`;

export interface AppVersionPolicy {
  readonly versaoMinimaObrigatoria: AppVersion;
}

export type AppVersionValidationStatus =
  | "compativel"
  | "atualizacao_obrigatoria";

export interface AppVersionValidationResult {
  readonly versaoLocal: AppVersion;
  readonly versaoMinimaObrigatoria: AppVersion;
  readonly status: AppVersionValidationStatus;
}

/**
 * Porta do serviço que compara a versão instalada com a política remota.
 * A infraestrutura poderá obter a versão mínima no Supabase ou em outra fonte.
 */
export interface IAppVersionValidator {
  validarVersaoLocal(
    versaoLocal: AppVersion,
  ): Promise<AppVersionValidationResult>;
}
