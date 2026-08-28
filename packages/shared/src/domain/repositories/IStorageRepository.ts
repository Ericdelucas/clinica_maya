export type FotoEvolucaoId = string;

export interface UploadFotoEvolucaoInput {
  readonly pacienteId: string;
  readonly prontuarioId: string;
  readonly nomeArquivo: string;
  readonly mimeType: string;
  readonly conteudo: Uint8Array;
  readonly capturadaEm: string;
}

export interface FotoEvolucaoArmazenada {
  readonly id: FotoEvolucaoId;
  readonly chaveArmazenamento: string;
  readonly nomeArquivo: string;
  readonly mimeType: string;
  readonly tamanhoBytes: number;
  readonly criadaEm: string;
  readonly url?: string;
}

/**
 * Repositório de fotos de evolução clínica.
 * A implementação poderá usar Supabase Storage ou armazenamento local.
 */
export interface IStorageRepository {
  uploadFotoEvolucao(
    input: UploadFotoEvolucaoInput,
  ): Promise<FotoEvolucaoArmazenada>;
}
