import {
  Agendamento,
  type AgendarHorarioInput,
  type HorarioClinicoDisponivel,
  type ICalendarioRepository,
  type PeriodoCalendario,
} from "@smartsaude/shared";

export class MockCalendarioRepository implements ICalendarioRepository {
  async buscarHorariosDisponiveis(
    periodo: PeriodoCalendario,
    profissionalId: string,
  ): Promise<readonly HorarioClinicoDisponivel[]> {
    const firstDay = new Date(periodo.inicio);
    const sampleDays = [3, 5, 8, 12, 12, 18, 23, 27];

    return Promise.resolve(
      sampleDays.map((day, index) => {
        const start = new Date(
          firstDay.getFullYear(),
          firstDay.getMonth(),
          day,
          index % 2 === 0 ? 9 : 14,
        );
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return {
          inicio: start.toISOString(),
          fim: end.toISOString(),
          profissionalId,
        };
      }),
    );
  }

  async agendarHorario(input: AgendarHorarioInput): Promise<Agendamento> {
    const now = new Date().toISOString();
    return Promise.resolve(
      Agendamento.criar({
        id: crypto.randomUUID(),
        pacienteId: input.pacienteId,
        inicio: input.inicio,
        fim: input.fim,
        status: "agendado",
        ...(input.observacoes === undefined
          ? {}
          : { observacoes: input.observacoes }),
      }),
    );
  }
}
