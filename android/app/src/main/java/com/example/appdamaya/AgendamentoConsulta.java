package com.example.appdamaya;

public final class AgendamentoConsulta {
    public final String id;
    public final String patientName;
    public final String patientId;
    public final long dayMillis;
    public final String time;
    public final String notes;

    public AgendamentoConsulta(
            String id,
            String patientId,
            String patientName,
            long dayMillis,
            String time,
            String notes
    ) {
        this.id = id;
        this.patientId = patientId;
        this.patientName = patientName;
        this.dayMillis = dayMillis;
        this.time = time;
        this.notes = notes;
    }
}
