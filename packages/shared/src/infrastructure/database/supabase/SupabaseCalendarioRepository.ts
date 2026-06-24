import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Agendamento,
  type StatusAgendamento,
} from "../../../domain/entities/Agendamento.js";
import type {
  AgendarHorarioInput,
  HorarioClinicoDisponivel,
  ICalendarioRepository,
  PeriodoCalendario,
} from "../../../domain/repositories/ICalendarioRepository.js";
import { getSupabaseClient } from "./SupabaseClient.js";

interface AgendamentoRow {
  readonly id: string;
  readonly paciente_id: string;
  readonly profissional_id: string;
  readonly inicio: string;
  readonly fim: string;
  readonly status: StatusAgendamento;
  readonly observacoes: string | null;
}

const agendamentoColumns =
  "id,paciente_id,profissional_id,inicio,fim,status,observacoes";

export class SupabaseCalendarioRepository implements ICalendarioRepository {
  constructor(private readonly client: SupabaseClient = getSupabaseClient()) {}

  async buscarHorariosDisponiveis(
    periodo: PeriodoCalendario,
    profissionalId: string,
  ): Promise<readonly HorarioClinicoDisponivel[]> {
    const { data, error } = await this.client
      .from("agendamentos")
      .select(agendamentoColumns)
      .eq("profissional_id", profissionalId)
      .gte("inicio", periodo.inicio)
      .lt("inicio", periodo.fim)
      .neq("status", "cancelado")
      .order("inicio", { ascending: true });

    if (error) {
      throw new Error(`Falha ao buscar agenda: ${error.message}`, {
        cause: error,
      });
    }

    return ((data ?? []) as AgendamentoRow[]).map((row) => ({
      inicio: row.inicio,
      fim: row.fim,
      profissionalId: row.profissional_id,
    }));
  }

  async agendarHorario(input: AgendarHorarioInput): Promise<Agendamento> {
    const payload = {
      paciente_id: input.pacienteId,
      profissional_id: input.profissionalId,
      inicio: input.inicio,
      fim: input.fim,
      status: "agendado" satisfies StatusAgendamento,
      observacoes: input.observacoes ?? null,
    };

    const { data, error } = await this.client
      .from("agendamentos")
      .insert(payload)
      .select(agendamentoColumns)
      .single();

    if (error) {
      throw new Error(`Falha ao criar agendamento: ${error.message}`, {
        cause: error,
      });
    }

    const row = data as AgendamentoRow;
    return Agendamento.criar({
      id: row.id,
      pacienteId: row.paciente_id,
      inicio: row.inicio,
      fim: row.fim,
      status: row.status,
      ...(row.observacoes === null ? {} : { observacoes: row.observacoes }),
    });
  }
}
