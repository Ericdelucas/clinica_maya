import { useEffect, useMemo, useState } from "react";
import type {
  HorarioClinicoDisponivel,
  ICalendarioRepository,
} from "@smartsaude/shared";
import styles from "./ClinicCalendar.module.css";

export interface ClinicCalendarProps {
  readonly repository: ICalendarioRepository;
  readonly profissionalId: string;
  readonly initialDate?: Date;
}

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ClinicCalendar({
  repository,
  profissionalId,
  initialDate = new Date(),
}: ClinicCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const [slots, setSlots] = useState<readonly HorarioClinicoDisponivel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const end = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);

    setIsLoading(true);
    setError(null);
    void repository
      .buscarHorariosDisponiveis(
        { inicio: start.toISOString(), fim: end.toISOString() },
        profissionalId,
      )
      .then((result) => {
        if (active) setSlots(result);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar a agenda.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profissionalId, repository, visibleMonth]);

  const calendarCells = useMemo(() => {
    const firstWeekDay = visibleMonth.getDay();
    const daysInMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + 1,
      0,
    ).getDate();
    return [
      ...Array.from({ length: firstWeekDay }, () => null),
      ...Array.from(
        { length: daysInMonth },
        (_, index) =>
          new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1),
      ),
    ];
  }, [visibleMonth]);

  const slotsByDay = useMemo(() => {
    const grouped = new Map<string, readonly HorarioClinicoDisponivel[]>();
    for (const slot of slots) {
      const key = dateKey(new Date(slot.inicio));
      grouped.set(key, [...(grouped.get(key) ?? []), slot]);
    }
    return grouped;
  }, [slots]);

  const changeMonth = (offset: number) => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  return (
    <section className={styles.container} aria-labelledby="calendar-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Agenda clínica</p>
          <h2 id="calendar-title">{monthFormatter.format(visibleMonth)}</h2>
        </div>
        <nav className={styles.navigation} aria-label="Navegar entre meses">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
            ←
          </button>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Próximo mês">
            →
          </button>
        </nav>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {isLoading && <p className={styles.status}>Carregando horários…</p>}

      <div className={styles.calendar} aria-busy={isLoading}>
        {weekDays.map((day) => (
          <div className={styles.weekDay} key={day} aria-hidden="true">{day}</div>
        ))}
        {calendarCells.map((date, index) => {
          if (!date) return <div className={styles.empty} key={`empty-${index}`} />;
          const daySlots = slotsByDay.get(dateKey(date)) ?? [];
          return (
            <button
              className={styles.day}
              data-has-slots={daySlots.length > 0}
              key={dateKey(date)}
              type="button"
              aria-label={`${date.getDate()} de ${monthFormatter.format(visibleMonth)}, ${daySlots.length} horários disponíveis`}
            >
              <span>{date.getDate()}</span>
              {daySlots.length > 0 && (
                <small>{daySlots.length} {daySlots.length === 1 ? "horário" : "horários"}</small>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
