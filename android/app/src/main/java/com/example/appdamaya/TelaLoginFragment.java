package com.example.appdamaya;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.navigation.fragment.NavHostFragment;

import com.example.appdamaya.databinding.TelaLoginBinding;

public class TelaLoginFragment extends Fragment {
    private TelaLoginBinding binding;
    private final java.util.List<SessaoUsuario> testPatients = new java.util.ArrayList<>();

    @Override
    public View onCreateView(
            @NonNull LayoutInflater inflater,
            ViewGroup container,
            Bundle savedInstanceState
    ) {
        binding = TelaLoginBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        DadosClinica.obterPerfilTeste("patient");
        testPatients.clear();
        SessaoUsuario test = DadosClinica.obterPerfilTeste("patient");
        testPatients.add(test);
        for (SessaoUsuario patient : DadosClinica.patients) if (!patient.id.equals(test.id)) testPatients.add(patient);
        java.util.List<String> names = new java.util.ArrayList<>();
        for (SessaoUsuario patient : testPatients) names.add(patient.fullName + " · " + patient.email);
        android.widget.ArrayAdapter<String> choices = new android.widget.ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, names);
        choices.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        binding.spinnerTestPatient.setAdapter(choices);
        binding.loginRole.setOnCheckedChangeListener((group, id) -> binding.layoutTestPatient.setVisibility(
                id == R.id.roleProfessional ? View.GONE : View.VISIBLE));
        binding.buttonLogin.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.buttonLogin.setOnClickListener(v -> entrarNoAplicativo());
    }

    private void entrarNoAplicativo() {
        binding.textError.setVisibility(View.GONE);
        boolean professional = binding.loginRole.getCheckedRadioButtonId() == R.id.roleProfessional;
        SessaoUsuario profile = professional ? DadosClinica.obterPerfilTeste("admin")
                : testPatients.get(binding.spinnerTestPatient.getSelectedItemPosition());
        DadosClinica.current = profile;
        NavHostFragment.findNavController(this).navigate(R.id.acao_login_para_painel);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
