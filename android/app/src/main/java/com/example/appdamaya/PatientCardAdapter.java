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

public class PatientCardAdapter extends RecyclerView.Adapter<PatientCardAdapter.Holder> {
    public interface Listener {
        void onOpenMannequin(ClinicSession patient);
    }

    private final List<ClinicSession> items = new ArrayList<>();
    private final Listener listener;
    private String openPatientId = "";

    public PatientCardAdapter(Listener listener) {
        this.listener = listener;
    }

    public void submit(List<ClinicSession> next, String openId) {
        items.clear();
        items.addAll(next);
        openPatientId = openId == null ? "" : openId;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_patient_card, parent, false);
        return new Holder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull Holder holder, int position) {
        ClinicSession patient = items.get(position);
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
