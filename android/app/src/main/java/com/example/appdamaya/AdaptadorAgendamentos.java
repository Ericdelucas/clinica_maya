package com.example.appdamaya;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

public class AdaptadorAgendamentos extends RecyclerView.Adapter<AdaptadorAgendamentos.Holder> {
    public interface Listener { void onCancel(AgendamentoConsulta visit); }
    private final Listener listener;
    public AdaptadorAgendamentos(Listener listener) { this.listener = listener; }
    private final List<AgendamentoConsulta> items = new ArrayList<>();

    public void atualizarLista(List<AgendamentoConsulta> next) {
        items.clear();
        items.addAll(next);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_agendamento, parent, false);
        return new Holder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull Holder holder, int position) {
        AgendamentoConsulta item = items.get(position);
        holder.cancel.setVisibility(listener == null ? View.GONE : View.VISIBLE);
        holder.cancel.setOnClickListener(v -> { if (listener != null) listener.onCancel(item); });
        holder.time.setText(item.time);
        holder.patient.setText(item.patientName);
        holder.notes.setText(item.notes == null || item.notes.isEmpty() ? "" : item.notes);
        holder.notes.setVisibility(item.notes == null || item.notes.isEmpty() ? View.GONE : View.VISIBLE);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class Holder extends RecyclerView.ViewHolder {
        final TextView time;
        final TextView patient;
        final TextView notes;
        final android.widget.Button cancel;

        Holder(View itemView) {
            super(itemView);
            time = itemView.findViewById(R.id.textAppointmentTime);
            patient = itemView.findViewById(R.id.textAppointmentPatient);
            notes = itemView.findViewById(R.id.textAppointmentNotes);
            cancel = itemView.findViewById(R.id.buttonCancelAppointment);
        }
    }
}
