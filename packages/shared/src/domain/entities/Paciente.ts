export interface PacienteProps {
  readonly id: string;
  readonly nome: string;
  readonly dataNascimento: string;
  readonly telefone?: string;
  readonly email?: string;
  readonly criadoEm: string;
  readonly atualizadoEm: string;
}

export class Paciente {
  private constructor(private readonly props: PacienteProps) {}

  static criar(props: PacienteProps): Paciente {
    if (!props.id.trim()) throw new Error("Paciente deve possuir um identificador.");
    if (!props.nome.trim()) throw new Error("Paciente deve possuir um nome.");
    return new Paciente(props);
  }

  get dados(): Readonly<PacienteProps> {
    return this.props;
  }
}
