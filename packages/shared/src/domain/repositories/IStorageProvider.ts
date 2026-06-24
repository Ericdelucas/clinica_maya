export interface UploadFotoClinicaInput {
  readonly pacienteId: string;
  readonly nomeArquivo: string;
  readonly mimeType: string;
  /** Conteúdo binário agnóstico de APIs de browser, Node.js ou Capacitor. */
  readonly conteudo: Uint8Array;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface FotoClinicaArmazenada {
  /** Chave estável usada para recuperar ou remover o objeto no provider. */
  readonly chave: string;
  readonly nomeArquivo: string;
  readonly mimeType: string;
  readonly tamanhoBytes: number;
  readonly criadoEm: string;
  /** Pode ser uma URL remota ou um URI resolvido pela implementação local. */
  readonly url?: string;
}

/**
 * Porta de saída para armazenamento de fotos clínicas.
 * Implementações possíveis: Supabase Storage, filesystem local ou outro backend.
 */
export interface IStorageProvider {
  uploadFotoClinica(
    input: UploadFotoClinicaInput,
  ): Promise<FotoClinicaArmazenada>;
  obterFotoClinica(chave: string): Promise<Uint8Array | null>;
  obterUrlFotoClinica(chave: string): Promise<string | null>;
  removerFotoClinica(chave: string): Promise<void>;
}
