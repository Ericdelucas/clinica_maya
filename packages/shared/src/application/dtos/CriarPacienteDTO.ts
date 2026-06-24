export interface CriarPacienteDTO {
  readonly nome: string;
  readonly dataNascimento: string;
  readonly telefone?: string;
  readonly email?: string;
}

export interface ErroValidacaoDTO {
  readonly campo: keyof CriarPacienteDTO;
  readonly mensagem: string;
}

export function validarCriarPacienteDTO(
  dto: CriarPacienteDTO,
): readonly ErroValidacaoDTO[] {
  const erros: ErroValidacaoDTO[] = [];
  if (!dto.nome.trim()) erros.push({ campo: "nome", mensagem: "Nome é obrigatório." });
  if (Number.isNaN(Date.parse(dto.dataNascimento))) {
    erros.push({ campo: "dataNascimento", mensagem: "Data de nascimento inválida." });
  }
  if (dto.email !== undefined && !/^\S+@\S+\.\S+$/.test(dto.email)) {
    erros.push({ campo: "email", mensagem: "E-mail inválido." });
  }
  return erros;
}
