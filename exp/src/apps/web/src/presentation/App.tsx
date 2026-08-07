import {
  type ICalendarioRepository,
  SupabaseCalendarioRepository,
  type AnatomicalNode,
} from "@smartsaude/shared";
import { AnatomicalCanvas } from "../components/AnatomicalModel";
import { ClinicCalendar } from "../components/Calendar";
import { VersionGuard } from "../components/Common";
import { MockAppVersionValidator } from "../mocks/MockAppVersionValidator";
import { MockCalendarioRepository } from "../mocks/MockCalendarioRepository";
import { APP_VERSION } from "../generated/appVersion";
import styles from "./App.module.css";

const simulateOutdated = new URLSearchParams(window.location.search).has("outdated");
const versionValidator = new MockAppVersionValidator(
  simulateOutdated ? "1.00.000" : APP_VERSION,
);
const hasSupabaseConfig =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
const calendarRepository: ICalendarioRepository = hasSupabaseConfig
  ? new SupabaseCalendarioRepository()
  : new MockCalendarioRepository();

const anatomicalNodes: readonly AnatomicalNode[] = [
  {
    id: "ombro-direito",
    nomeArticulacao: "Ombro direito",
    coordenadas: { x: 1.05, y: 1.1, z: 0.2 },
    youtubeUrl: "https://www.youtube.com/watch?v=exemplo-ombro",
  },
  {
    id: "quadril-esquerdo",
    nomeArticulacao: "Quadril esquerdo",
    coordenadas: { x: -0.65, y: -0.7, z: 0.65 },
    youtubeUrl: "https://www.youtube.com/watch?v=exemplo-quadril",
  },
  {
    id: "joelho-direito",
    nomeArticulacao: "Joelho direito",
    coordenadas: { x: 0.48, y: -1.65, z: 0.7 },
    youtubeUrl: "https://youtu.be/exemplo-joelho",
  },
];

export function App() {
  return (
    <VersionGuard
      localVersion={APP_VERSION}
      validator={versionValidator}
      downloadUrl="/downloads/SmartSaude-Setup.exe"
    >
      <main className={styles.app}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>S</span>
            SmartSaúde
          </div>
          <span className={styles.profile}>Clínica Maya · Área profissional</span>
        </header>

        <section className={styles.intro}>
          <p>Painel clínico</p>
          <h1>Cuidado organizado, movimento acompanhado.</h1>
        </section>

        <div className={styles.grid}>
          <ClinicCalendar
            repository={calendarRepository}
            profissionalId="maya"
          />
          <AnatomicalCanvas nodes={anatomicalNodes} />
        </div>
      </main>
    </VersionGuard>
  );
}
