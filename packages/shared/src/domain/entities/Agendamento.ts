export type StatusAgendamento =
  | "agendado"
  | "confirmado"
  | "concluido"
  | "cancelado";

export interface AgendamentoProps {
  readonly id: string;
  readonly pacienteId: string;
  readonly inicio: string;
  readonly fim: string;
  readonly status: StatusAgendamento;
  readonly observacoes?: string;
}

export class Agendamento {
  private constructor(private readonly props: AgendamentoProps) {}

  static criar(props: AgendamentoProps): Agendamento {
    if (!props.id.trim() || !props.pacienteId.trim()) {
      throw new Error("Agendamento e paciente devem possuir identificadores.");
    }
    if (new Date(props.fim).getTime() <= new Date(props.inicio).getTime()) {
      throw new Error("O fim do agendamento deve ser posterior ao início.");
    }
    return new Agendamento(props);
  }

  get dados(): Readonly<AgendamentoProps> {
    return this.props;
  }
}
