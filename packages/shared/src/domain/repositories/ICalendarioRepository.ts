import type { Agendamento } from "../entities/Agendamento.js";

export type DataHoraISO = string;

export interface PeriodoCalendario {
  readonly inicio: DataHoraISO;
  readonly fim: DataHoraISO;
}

export interface HorarioClinicoDisponivel {
  readonly inicio: DataHoraISO;
  readonly fim: DataHoraISO;
  readonly profissionalId: string;
}

export interface AgendarHorarioInput {
  readonly pacienteId: string;
  readonly profissionalId: string;
  readonly inicio: DataHoraISO;
  readonly fim: DataHoraISO;
  readonly observacoes?: string;
}

export interface ICalendarioRepository {
  buscarHorariosDisponiveis(
    periodo: PeriodoCalendario,
    profissionalId: string,
  ): Promise<readonly HorarioClinicoDisponivel[]>;

  agendarHorario(input: AgendarHorarioInput): Promise<Agendamento>;
}
