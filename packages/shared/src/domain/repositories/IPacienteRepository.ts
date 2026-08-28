import type { Paciente } from "../entities/Paciente.js";

export interface IPacienteRepository {
  buscarPorId(id: string): Promise<Paciente | null>;
  listar(): Promise<readonly Paciente[]>;
  salvar(paciente: Paciente): Promise<void>;
  remover(id: string): Promise<void>;
}
