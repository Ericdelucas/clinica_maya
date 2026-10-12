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
        binding.buttonLogin.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.buttonLogin.setOnClickListener(v -> attemptLogin());
    }

    private void attemptLogin() {
        binding.textError.setVisibility(View.GONE);
        ClinicSession profile = ClinicStore.testProfile(
                binding.loginRole.getCheckedRadioButtonId() == R.id.roleProfessional ? "admin" : "patient");
        ClinicStore.current = profile;
        NavHostFragment.findNavController(this).navigate(R.id.action_login_to_dashboard);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
