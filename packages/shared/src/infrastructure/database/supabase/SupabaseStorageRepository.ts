import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FotoEvolucaoArmazenada,
  IStorageRepository,
  UploadFotoEvolucaoInput,
} from "../../../domain/repositories/IStorageRepository.js";
import { getSupabaseClient } from "./SupabaseClient.js";

const DEFAULT_BUCKET = "fotos-clinicas";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function safePathSegment(value: string): string {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function createObjectId(): string {
  const runtimeCrypto = (
    globalThis as typeof globalThis & {
      readonly crypto?: { randomUUID(): string };
    }
  ).crypto;
  if (!runtimeCrypto) {
    throw new Error("O runtime não oferece geração segura de UUID.");
  }
  return runtimeCrypto.randomUUID();
}

export class SupabaseStorageRepository implements IStorageRepository {
  constructor(
    private readonly client: SupabaseClient = getSupabaseClient(),
    private readonly bucket: string = DEFAULT_BUCKET,
  ) {}

  async uploadFotoEvolucao(
    input: UploadFotoEvolucaoInput,
  ): Promise<FotoEvolucaoArmazenada> {
    const id = createObjectId();
    const objectPath = [
      safePathSegment(input.pacienteId),
      safePathSegment(input.prontuarioId),
      `${id}-${safePathSegment(input.nomeArquivo)}`,
    ].join("/");
    const fileBody = input.conteudo.buffer.slice(
      input.conteudo.byteOffset,
      input.conteudo.byteOffset + input.conteudo.byteLength,
    ) as ArrayBuffer;

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(objectPath, fileBody, {
        contentType: input.mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Falha no upload da foto clínica: ${error.message}`, {
        cause: error,
      });
    }

    const { data: signedData, error: signedError } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(data.path, SIGNED_URL_TTL_SECONDS);

    const baseResult = {
      id,
      chaveArmazenamento: data.path,
      nomeArquivo: input.nomeArquivo,
      mimeType: input.mimeType,
      tamanhoBytes: input.conteudo.byteLength,
      criadaEm: new Date().toISOString(),
    };

    return signedError
      ? baseResult
      : { ...baseResult, url: signedData.signedUrl };
  }
}
