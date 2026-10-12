package com.example.appdamaya;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

public class AdaptadorPacientes extends RecyclerView.Adapter<AdaptadorPacientes.Holder> {
    public interface Listener {
        void onOpenMannequin(SessaoUsuario patient);
    }

    private final List<SessaoUsuario> items = new ArrayList<>();
    private final Listener listener;
    private String openPatientId = "";

    public AdaptadorPacientes(Listener listener) {
        this.listener = listener;
    }

    public void atualizarLista(List<SessaoUsuario> next, String openId) {
        items.clear();
        items.addAll(next);
        openPatientId = openId == null ? "" : openId;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_paciente, parent, false);
        return new Holder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull Holder holder, int position) {
        SessaoUsuario patient = items.get(position);
        holder.name.setText(patient.fullName);
        holder.email.setText(patient.email);
        boolean open = patient.id.equals(openPatientId);
        holder.chipOpen.setVisibility(open ? View.VISIBLE : View.GONE);
        holder.open.setOnClickListener(v -> listener.onOpenMannequin(patient));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class Holder extends RecyclerView.ViewHolder {
        final TextView name;
        final TextView email;
        final TextView chipOpen;
        final Button open;

        Holder(View itemView) {
            super(itemView);
            name = itemView.findViewById(R.id.textPatientName);
            email = itemView.findViewById(R.id.textPatientEmail);
            chipOpen = itemView.findViewById(R.id.chipOpen);
            open = itemView.findViewById(R.id.buttonViewMannequin);
        }
    }
}
