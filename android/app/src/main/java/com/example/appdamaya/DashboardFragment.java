package com.example.appdamaya;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.GridLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.navigation.fragment.NavHostFragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.appdamaya.databinding.FragmentDashboardBinding;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class DashboardFragment extends Fragment {

    private FragmentDashboardBinding binding;
    private PatientCardAdapter adapter;
    private AppointmentAdapter proAppointments;
    private AppointmentAdapter patientAppointments;
    private String openPatientId = "";
    private String openPatientName = "";
    private String selectedJointId = "";
    private String selectedJoint = "";
    private long selectedDay = System.currentTimeMillis();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final SimpleDateFormat dayFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());

    @Override
    public View onCreateView(
            @NonNull LayoutInflater inflater,
            ViewGroup container,
            Bundle savedInstanceState
    ) {
        binding = FragmentDashboardBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        ClinicSession profile = ClinicStore.current;
        if (profile == null) {
            NavHostFragment.findNavController(this).navigate(R.id.action_dashboard_to_login);
            return;
        }

        bindProfile(profile);
        setupNavigation(profile);
        setupProfessionalPanel(profile);
        setupPatientPanel(profile);
        showMannequin(profile);
        populateJoints();
        refreshPatients();
    }

    private void bindProfile(ClinicSession profile) {
        binding.includeTopbar.textArea.setText(
                profile.isAdmin() ? R.string.area_profissional : R.string.area_paciente
        );
        binding.includeTopbar.textRoleBadge.setText(
                profile.isAdmin() ? R.string.role_profissional : R.string.role_paciente
        );
        String initial = (profile.fullName == null || profile.fullName.isEmpty())
                ? "?"
                : profile.fullName.substring(0, 1).toUpperCase(Locale.ROOT);
        binding.includeTopbar.buttonAvatar.setText(initial);
        binding.includeTopbar.textProfileName.setText(profile.fullName);
        binding.includeTopbar.textProfileEmail.setText(profile.email);
        binding.includeCredentials.inputProfileEmail.setText(profile.email);

        binding.includeTopbar.buttonAvatar.setOnClickListener(v -> {
            View menu = binding.includeTopbar.layoutProfileMenu;
            menu.setVisibility(menu.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE);
        });
        binding.includeTopbar.buttonChangeCredentials.setOnClickListener(v -> {
            binding.includeTopbar.layoutProfileMenu.setVisibility(View.GONE);
            binding.includeCredentials.getRoot().setVisibility(View.VISIBLE);
        });
        binding.includeTopbar.buttonLogout.setOnClickListener(v -> {
            ClinicStore.current = null;
            NavHostFragment.findNavController(this).navigate(R.id.action_dashboard_to_login);
        });
        binding.includeCredentials.buttonCloseCredentials.setOnClickListener(v ->
                binding.includeCredentials.getRoot().setVisibility(View.GONE)
        );
        binding.includeCredentials.buttonSaveCredentials.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includeCredentials.buttonSaveCredentials.setOnClickListener(v -> saveCredentials(profile));
    }

    private void setupNavigation(ClinicSession profile) {
        binding.buttonMannequinTab.setOnClickListener(v -> showMannequin(profile));
        binding.buttonPanelTab.setOnClickListener(v -> showPanel(profile));
        binding.buttonPanelTab.setText(profile.isAdmin() ? R.string.nav_panel : R.string.nav_my_area);
        binding.includeMannequin.buttonOpenPanel.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includeMannequin.buttonOpenPanel.setOnClickListener(v -> showPanel(profile));
        binding.includeMannequin.textCanvasHint.setText(
                profile.isAdmin() ? R.string.canvas_hint_admin : R.string.canvas_hint_patient
        );
        binding.includeMannequin.buttonOpenPanel.setVisibility(profile.isAdmin() ? View.VISIBLE : View.GONE);
        binding.includeMannequin.mannequinView.setListener(hotspot -> handleHotspot(profile, hotspot));
    }

    private void setupProfessionalPanel(ClinicSession profile) {
        if (!profile.isAdmin()) {
            return;
        }
        adapter = new PatientCardAdapter(patient -> {
            openPatientId = patient.id;
            openPatientName = patient.fullName;
            binding.bannerMannequin.setText("Boneco de " + patient.fullName + " · vídeos só dele");
            binding.bannerMannequin.setVisibility(View.VISIBLE);
            binding.includePanelPro.textVideosHint.setText(
                    "Editando o boneco de " + patient.fullName + ". Os links valem só para ele."
            );
            binding.includePanelPro.textVideosHint.setTextColor(
                    ContextCompat.getColor(requireContext(), R.color.maya_text_muted)
            );
            toast("Boneco de " + patient.fullName + " — vídeos só dele.");
            refreshPatients();
            populateJoints();
            showMannequin(profile);
        });
        binding.includePanelPro.listPatients.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.includePanelPro.listPatients.setAdapter(adapter);

        binding.includePanelPro.tabPacientes.setOnClickListener(v -> selectProTab("patients"));
        binding.includePanelPro.tabArticulacoes.setOnClickListener(v -> selectProTab("joints"));
        binding.includePanelPro.tabCadastrar.setOnClickListener(v -> selectProTab("register"));
        binding.includePanelPro.tabExames.setOnClickListener(v -> selectProTab("exams"));
        binding.includePanelPro.tabVisao.setOnClickListener(v -> selectProTab("vision"));
        binding.includePanelPro.tabCalendario.setOnClickListener(v -> selectProTab("calendar"));
        binding.includePanelPro.buttonCloseVision.setOnClickListener(v -> selectProTab("patients"));
        binding.includePanelPro.buttonRegisterPatient.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includePanelPro.buttonRegisterPatient.setOnClickListener(v -> registerPatient());
        binding.includePanelPro.buttonSaveVideo.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includePanelPro.buttonSaveVideo.setOnClickListener(v -> saveJointVideo());
        binding.includePanelPro.buttonOpenVideo.setOnClickListener(v -> openSelectedVideo());
        binding.includePanelPro.buttonClearVideo.setOnClickListener(v -> clearJointVideo());
        binding.includePanelPro.buttonAddAppointment.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includePanelPro.buttonAddAppointment.setOnClickListener(v -> addAppointment());
        binding.includePanelPro.calendarView.setOnDateChangeListener((view, year, month, dayOfMonth) -> {
            java.util.Calendar calendar = java.util.Calendar.getInstance();
            calendar.set(year, month, dayOfMonth, 0, 0, 0);
            calendar.set(java.util.Calendar.MILLISECOND, 0);
            selectedDay = calendar.getTimeInMillis();
            refreshAppointments(true);
        });
        proAppointments = new AppointmentAdapter();
        binding.includePanelPro.listAppointments.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.includePanelPro.listAppointments.setAdapter(proAppointments);
        refreshAppointments(true);
        selectProTab("patients");
    }

    private void setupPatientPanel(ClinicSession profile) {
        if (profile.isAdmin()) {
            return;
        }
        ArrayAdapter<CharSequence> spinnerAdapter = ArrayAdapter.createFromResource(
                requireContext(),
                R.array.psychotherapy_options,
                android.R.layout.simple_spinner_dropdown_item
        );
        binding.includePanelPaciente.includeFicha.spinnerPsychotherapy.setAdapter(spinnerAdapter);
        binding.includePanelPaciente.includeFicha.inputFullName.setText(profile.fullName);
        binding.includePanelPaciente.tabFicha.setOnClickListener(v -> selectPatientTab("ficha"));
        binding.includePanelPaciente.tabExamesPaciente.setOnClickListener(v -> selectPatientTab("exams"));
        binding.includePanelPaciente.tabOrientacoes.setOnClickListener(v -> selectPatientTab("guide"));
        binding.includePanelPaciente.tabAgenda.setOnClickListener(v -> selectPatientTab("calendar"));
        binding.includePanelPaciente.includeFicha.buttonSaveFicha.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includePanelPaciente.buttonSendExam.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includePanelPaciente.includeFicha.buttonSaveFicha.setOnClickListener(v ->
                toast(getString(R.string.action_save_ficha))
        );
        binding.includePanelPaciente.buttonPickFile.setOnClickListener(v ->
                toast(getString(R.string.action_pick_file))
        );
        binding.includePanelPaciente.buttonSendExam.setOnClickListener(v ->
                toast(getString(R.string.action_send_exam))
        );
        patientAppointments = new AppointmentAdapter();
        binding.includePanelPaciente.listAppointmentsPatient.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.includePanelPaciente.listAppointmentsPatient.setAdapter(patientAppointments);
        binding.includePanelPaciente.calendarViewPatient.setOnDateChangeListener((view, year, month, dayOfMonth) -> {
            java.util.Calendar calendar = java.util.Calendar.getInstance();
            calendar.set(year, month, dayOfMonth, 0, 0, 0);
            calendar.set(java.util.Calendar.MILLISECOND, 0);
            selectedDay = calendar.getTimeInMillis();
            refreshAppointments(false);
        });
        refreshAppointments(false);
        selectPatientTab("ficha");
    }

    private void showMannequin(ClinicSession profile) {
        binding.includeMannequin.getRoot().setVisibility(View.VISIBLE);
        binding.includePanelPro.getRoot().setVisibility(View.GONE);
        binding.includePanelPaciente.getRoot().setVisibility(View.GONE);
        styleSwitch(true, profile);
    }

    private void showPanel(ClinicSession profile) {
        binding.includeMannequin.getRoot().setVisibility(View.GONE);
        binding.includePanelPro.getRoot().setVisibility(profile.isAdmin() ? View.VISIBLE : View.GONE);
        binding.includePanelPaciente.getRoot().setVisibility(profile.isAdmin() ? View.GONE : View.VISIBLE);
        styleSwitch(false, profile);
    }

    private void styleSwitch(boolean mannequin, ClinicSession profile) {
        binding.buttonMannequinTab.setSelected(mannequin);
        binding.buttonPanelTab.setSelected(!mannequin);
        binding.buttonMannequinTab.setTextColor(ContextCompat.getColor(
                requireContext(), mannequin ? R.color.white : R.color.maya_text_muted
        ));
        binding.buttonPanelTab.setTextColor(ContextCompat.getColor(
                requireContext(), !mannequin ? R.color.white : R.color.maya_text_muted
        ));
        binding.buttonPanelTab.setText(profile.isAdmin() ? R.string.nav_panel : R.string.nav_my_area);
    }

    private void selectProTab(String tab) {
        binding.includePanelPro.contentPacientes.setVisibility("patients".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPro.contentArticulacoes.setVisibility("joints".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPro.contentCadastrar.setVisibility("register".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPro.contentExamesPro.setVisibility("exams".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPro.contentVisao.setVisibility("vision".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPro.contentCalendario.setVisibility("calendar".equals(tab) ? View.VISIBLE : View.GONE);
        markTab(binding.includePanelPro.tabPacientes, "patients".equals(tab));
        markTab(binding.includePanelPro.tabArticulacoes, "joints".equals(tab));
        markTab(binding.includePanelPro.tabCadastrar, "register".equals(tab));
        markTab(binding.includePanelPro.tabExames, "exams".equals(tab));
        markTab(binding.includePanelPro.tabVisao, "vision".equals(tab));
        markTab(binding.includePanelPro.tabCalendario, "calendar".equals(tab));
    }

    private void selectPatientTab(String tab) {
        binding.includePanelPaciente.contentFicha.setVisibility("ficha".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPaciente.contentExamesPaciente.setVisibility("exams".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPaciente.contentOrientacoes.setVisibility("guide".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPaciente.contentAgenda.setVisibility("calendar".equals(tab) ? View.VISIBLE : View.GONE);
        markTab(binding.includePanelPaciente.tabFicha, "ficha".equals(tab));
        markTab(binding.includePanelPaciente.tabExamesPaciente, "exams".equals(tab));
        markTab(binding.includePanelPaciente.tabOrientacoes, "guide".equals(tab));
        markTab(binding.includePanelPaciente.tabAgenda, "calendar".equals(tab));
    }

    private void markTab(Button button, boolean active) {
        button.setSelected(active);
        button.setTextColor(ContextCompat.getColor(
                requireContext(),
                active ? R.color.white : R.color.maya_text_muted
        ));
    }

    private void populateJoints() {
        if (binding == null) {
            return;
        }
        GridLayout grid = binding.includePanelPro.gridJoints;
        grid.removeAllViews();
        String ownerId = hotspotOwnerId();
        for (ClinicalHotspot hotspot : ClinicalHotspot.ALL) {
            View chip = LayoutInflater.from(requireContext()).inflate(R.layout.item_joint_chip, grid, false);
            TextView title = chip.findViewById(R.id.textJointLabel);
            TextView status = chip.findViewById(R.id.textJointStatus);
            title.setText(hotspot.label);
            status.setText(ClinicStore.hasVideo(ownerId, hotspot.id) ? R.string.with_link : R.string.without_link);
            GridLayout.LayoutParams params = new GridLayout.LayoutParams();
            params.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
            params.width = 0;
            chip.setLayoutParams(params);
            chip.setOnClickListener(v -> selectJoint(hotspot, false));
            grid.addView(chip);
        }
    }

    private void handleHotspot(ClinicSession profile, ClinicalHotspot hotspot) {
        if (profile.isAdmin()) {
            if (openPatientId.isEmpty()) {
                toast("Abra o boneco de um paciente em Pacientes → Ver boneco.");
                return;
            }
            selectJoint(hotspot, true);
            return;
        }
        String url = ClinicStore.videoUrl(profile.id, hotspot.id);
        if (url.isEmpty()) {
            toast("Ainda não há vídeo cadastrado para esta articulação.");
            return;
        }
        openUrl(url);
    }

    private void selectJoint(ClinicalHotspot hotspot, boolean openPanel) {
        selectedJointId = hotspot.id;
        selectedJoint = hotspot.label;
        binding.includePanelPro.textSelectedJoint.setText(hotspot.label + " · " + hotspot.region);
        binding.includePanelPro.inputYoutube.setText(ClinicStore.videoUrl(hotspotOwnerId(), hotspot.id));
        binding.includeMannequin.mannequinView.setSelectedId(hotspot.id);
        if (openPanel && ClinicStore.current != null && ClinicStore.current.isAdmin()) {
            selectProTab("joints");
            showPanel(ClinicStore.current);
        }
    }

    private String hotspotOwnerId() {
        if (ClinicStore.current != null && !ClinicStore.current.isAdmin()) {
            return ClinicStore.current.id;
        }
        return openPatientId;
    }

    private void saveJointVideo() {
        if (openPatientId.isEmpty() || selectedJointId.isEmpty()) {
            toast(openPatientId.isEmpty()
                    ? "Abra o boneco de um paciente antes de salvar o vídeo."
                    : getString(R.string.no_joint));
            return;
        }
        String url = String.valueOf(binding.includePanelPro.inputYoutube.getText()).trim();
        if (!url.isEmpty() && !isYoutube(url)) {
            toast("Informe uma URL válida do YouTube.");
            return;
        }
        ClinicStore.setVideoUrl(openPatientId, selectedJointId, url);
        populateJoints();
        toast("Alteração salva para " + selectedJoint);
    }

    private void clearJointVideo() {
        if (openPatientId.isEmpty() || selectedJointId.isEmpty()) {
            toast(getString(R.string.no_joint));
            return;
        }
        ClinicStore.setVideoUrl(openPatientId, selectedJointId, "");
        binding.includePanelPro.inputYoutube.setText("");
        populateJoints();
        toast("Vídeo apagado.");
    }

    private void openSelectedVideo() {
        String url = String.valueOf(binding.includePanelPro.inputYoutube.getText()).trim();
        if (url.isEmpty() && !selectedJointId.isEmpty()) {
            url = ClinicStore.videoUrl(hotspotOwnerId(), selectedJointId);
        }
        if (url.isEmpty()) {
            toast("Cole a URL do YouTube e clique em Salvar Alteração.");
            return;
        }
        if (!isYoutube(url)) {
            toast("Informe uma URL válida do YouTube.");
            return;
        }
        openUrl(url);
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
            toast("Não foi possível abrir o vídeo.");
        }
    }

    private boolean isYoutube(String url) {
        String value = url.toLowerCase(Locale.ROOT);
        return (value.contains("youtube.com") || value.contains("youtu.be"))
                && (value.startsWith("http://") || value.startsWith("https://"));
    }

    private void refreshPatients() {
        List<ClinicSession> copy = new ArrayList<>(ClinicStore.patients);
        binding.includePanelPro.textPatientCount.setText(String.valueOf(copy.size()));
        binding.includePanelPro.textMannequinCount.setText(String.valueOf(copy.size()));
        if (adapter != null) {
            adapter.submit(copy, openPatientId);
        }
    }

    private void registerPatient() {
        String name = String.valueOf(binding.includePanelPro.inputPatientName.getText()).trim();
        String email = String.valueOf(binding.includePanelPro.inputPatientEmail.getText()).trim().toLowerCase(Locale.ROOT);
        String password = String.valueOf(binding.includePanelPro.inputPatientPassword.getText());
        TextView message = binding.includePanelPro.textRegisterMessage;
        message.setVisibility(View.VISIBLE);
        if (name.isEmpty() || email.isEmpty() || password.length() < 6) {
            message.setTextColor(ContextCompat.getColor(requireContext(), R.color.maya_danger));
            message.setText("Informe nome, e-mail e senha com pelo menos 6 caracteres.");
            return;
        }
        if (ClinicStore.isProfessionalEmail(email)) {
            message.setTextColor(ContextCompat.getColor(requireContext(), R.color.maya_danger));
            message.setText("Este e-mail é da profissional e não pode ser usado por paciente.");
            return;
        }
        ClinicStore.addPatient(name, email, password);
        binding.includePanelPro.inputPatientName.setText("");
        binding.includePanelPro.inputPatientEmail.setText("");
        binding.includePanelPro.inputPatientPassword.setText("");
        message.setTextColor(ContextCompat.getColor(requireContext(), R.color.maya_success));
        message.setText("Paciente " + email + " cadastrado.");
        refreshPatients();
    }

    private void addAppointment() {
        String name = String.valueOf(binding.includePanelPro.inputAppointmentPatient.getText()).trim();
        String time = String.valueOf(binding.includePanelPro.inputAppointmentTime.getText()).trim();
        String notes = String.valueOf(binding.includePanelPro.inputAppointmentNotes.getText()).trim();
        if (name.isEmpty() || time.isEmpty()) {
            toast("Informe paciente e horário.");
            return;
        }
        String patientId = openPatientId.isEmpty() ? name : openPatientId;
        ClinicStore.addAppointment(patientId, name, selectedDay, time, notes);
        binding.includePanelPro.inputAppointmentPatient.setText("");
        binding.includePanelPro.inputAppointmentTime.setText("");
        binding.includePanelPro.inputAppointmentNotes.setText("");
        refreshAppointments(true);
        toast("Horário agendado.");
    }

    private void refreshAppointments(boolean professional) {
        List<ClinicAppointment> items = ClinicStore.appointmentsForDay(
                selectedDay,
                professional ? null : (ClinicStore.current == null ? null : ClinicStore.current.id)
        );
        if (professional && proAppointments != null) {
            binding.includePanelPro.textSelectedDay.setText(dayFormat.format(new Date(selectedDay)));
            proAppointments.submit(items);
            binding.includePanelPro.textAppointmentsEmpty.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);
        }
        if (!professional && patientAppointments != null) {
            patientAppointments.submit(items);
            binding.includePanelPaciente.textAppointmentsEmptyPatient.setVisibility(
                    items.isEmpty() ? View.VISIBLE : View.GONE
            );
        }
    }

    private void saveCredentials(ClinicSession profile) {
        String nextEmail = String.valueOf(binding.includeCredentials.inputProfileEmail.getText()).trim();
        String password = String.valueOf(binding.includeCredentials.inputProfilePassword.getText());
        String confirm = String.valueOf(binding.includeCredentials.inputProfilePasswordConfirm.getText());
        if (!password.isEmpty() && !password.equals(confirm)) {
            binding.includeCredentials.textCredentialsError.setText("A confirmação da senha não confere.");
            binding.includeCredentials.textCredentialsError.setVisibility(View.VISIBLE);
            return;
        }
        profile.email = nextEmail;
        if (!password.isEmpty()) {
            profile.password = password;
        }
        binding.includeTopbar.textProfileEmail.setText(profile.email);
        binding.includeCredentials.getRoot().setVisibility(View.GONE);
        toast("Dados atualizados.");
    }

    private void toast(String text) {
        binding.textToast.setText(text);
        binding.textToast.setVisibility(View.VISIBLE);
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(() -> {
            if (binding != null) {
                binding.textToast.setVisibility(View.GONE);
            }
        }, 2800);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        handler.removeCallbacksAndMessages(null);
        binding = null;
    }
}
