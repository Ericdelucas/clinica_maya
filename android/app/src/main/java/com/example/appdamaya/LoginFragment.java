package com.example.appdamaya;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.navigation.fragment.NavHostFragment;

import com.example.appdamaya.databinding.FragmentLoginBinding;

public class LoginFragment extends Fragment {
    private FragmentLoginBinding binding;
    private final java.util.List<ClinicSession> testPatients = new java.util.ArrayList<>();

    @Override
    public View onCreateView(
            @NonNull LayoutInflater inflater,
            ViewGroup container,
            Bundle savedInstanceState
    ) {
        binding = FragmentLoginBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        ClinicStore.testProfile("patient");
        testPatients.clear();
        ClinicSession test = ClinicStore.testProfile("patient");
        testPatients.add(test);
        for (ClinicSession patient : ClinicStore.patients) if (!patient.id.equals(test.id)) testPatients.add(patient);
        java.util.List<String> names = new java.util.ArrayList<>();
        for (ClinicSession patient : testPatients) names.add(patient.fullName + " · " + patient.email);
        android.widget.ArrayAdapter<String> choices = new android.widget.ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, names);
        choices.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        binding.spinnerTestPatient.setAdapter(choices);
        binding.loginRole.setOnCheckedChangeListener((group, id) -> binding.layoutTestPatient.setVisibility(
                id == R.id.roleProfessional ? View.GONE : View.VISIBLE));
        binding.buttonLogin.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.buttonLogin.setOnClickListener(v -> attemptLogin());
    }

    private void attemptLogin() {
        binding.textError.setVisibility(View.GONE);
        boolean professional = binding.loginRole.getCheckedRadioButtonId() == R.id.roleProfessional;
        ClinicSession profile = professional ? ClinicStore.testProfile("admin")
                : testPatients.get(binding.spinnerTestPatient.getSelectedItemPosition());
        ClinicStore.current = profile;
        NavHostFragment.findNavController(this).navigate(R.id.action_login_to_dashboard);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
