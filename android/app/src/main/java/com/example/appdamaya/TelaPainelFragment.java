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

import com.example.appdamaya.databinding.TelaPainelBinding;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class TelaPainelFragment extends Fragment {

    private TelaPainelBinding binding;
    private AdaptadorPacientes adapter;
    private AdaptadorAgendamentos appointmentsAdapter;
    private final List<SessaoUsuario> videoPatients = new ArrayList<>();
    private boolean patientPreview;
    private String openPatientId = "";
    private String openPatientName = "";
    private String selectedJointId = "";
    private String selectedJoint = "";
    private String activeScreen = "mannequin";
    private long selectedDay = System.currentTimeMillis();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final SimpleDateFormat dayFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());

    @Override
    public View onCreateView(
            @NonNull LayoutInflater inflater,
            ViewGroup container,
            Bundle savedInstanceState
    ) {
        binding = TelaPainelBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        SessaoUsuario profile = DadosClinica.current;
        if (profile == null) {
            NavHostFragment.findNavController(this).navigate(R.id.acao_painel_para_login);
            return;
        }

        if (savedInstanceState != null) {
            selectedDay = savedInstanceState.getLong("selectedDay", selectedDay);
            activeScreen = savedInstanceState.getString("activeScreen", "mannequin");
        }
        String restoredScreen = activeScreen;
        preencherCabecalho(profile);
        configurarNavegacao(profile);
        configurarPainelProfissional(profile);
        configurarPainelPaciente(profile);
        binding.buttonCalendarTab.setVisibility(profile.ehProfissional() ? View.VISIBLE : View.GONE);
        if (profile.ehProfissional()) {
            configurarCalendario(profile);
            binding.buttonCalendarTab.setOnClickListener(v -> mostrarCalendario(profile));
        }
        if ("calendar".equals(restoredScreen) && profile.ehProfissional()) mostrarCalendario(profile);
        else if ("panel".equals(restoredScreen)) mostrarPainel(profile);
        else mostrarBoneco(profile);
        atualizarListaDeRegioes();
        atualizarListaDePacientes();
    }

    private void preencherCabecalho(SessaoUsuario profile) {
        binding.includeTopbar.textArea.setText(
                profile.ehProfissional() ? R.string.area_profissional : R.string.area_paciente
        );
        binding.includeTopbar.textRoleBadge.setText(
                profile.ehProfissional() ? R.string.role_profissional : R.string.role_paciente
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
            DadosClinica.current = null;
            NavHostFragment.findNavController(this).navigate(R.id.acao_painel_para_login);
        });
        binding.includeCredentials.buttonCloseCredentials.setOnClickListener(v ->
                binding.includeCredentials.getRoot().setVisibility(View.GONE)
        );
        binding.includeCredentials.buttonSaveCredentials.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includeCredentials.buttonSaveCredentials.setOnClickListener(v -> salvarDadosDeAcesso(profile));
    }

    private void configurarNavegacao(SessaoUsuario profile) {
        binding.buttonMannequinTab.setOnClickListener(v -> mostrarBoneco(profile));
        binding.buttonPanelTab.setOnClickListener(v -> mostrarPainel(profile));
        binding.buttonPanelTab.setText(profile.ehProfissional() ? R.string.nav_panel : R.string.nav_my_area);
        binding.includeMannequin.buttonOpenPanel.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includeMannequin.buttonOpenPanel.setOnClickListener(v -> mostrarPainel(profile));
        binding.includeMannequin.textCanvasHint.setText(
                profile.ehProfissional() ? R.string.canvas_hint_admin : R.string.canvas_hint_patient
        );
        binding.includeMannequin.buttonOpenPanel.setVisibility(profile.ehProfissional() ? View.VISIBLE : View.GONE);
        binding.includeMannequin.buttonFront.setOnClickListener(v -> binding.includeMannequin.mannequinView.mostrarLadoDoCorpo(false));
        binding.includeMannequin.buttonBack.setOnClickListener(v -> binding.includeMannequin.mannequinView.mostrarLadoDoCorpo(true));
        binding.includeMannequin.mannequinView.definirAoSelecionarRegiao(hotspot -> aoTocarNaRegiao(profile, hotspot));
    }

    private void configurarPainelProfissional(SessaoUsuario profile) {
        if (!profile.ehProfissional()) {
            return;
        }
        adapter = new AdaptadorPacientes(patient -> {
            selecionarPacienteDosVideos(patient);
            mostrarBoneco(profile);
        });
        binding.includePanelPro.spinnerVideoPatient.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
                if (position == 0 && !openPatientId.isEmpty()) {
                    openPatientId = "";
                    openPatientName = "";
                    selectedJointId = "";
                    selectedJoint = "";
                    binding.includePanelPro.inputYoutube.setText("");
                    binding.includePanelPro.textSelectedJoint.setText(R.string.no_joint);
                    binding.includePanelPro.textJointOrientation.setText(R.string.joint_orientation_hint);
                    binding.includePanelPro.textVideosHint.setText(R.string.videos_empty);
                    binding.includeMannequin.mannequinView.destacarRegiao("");
                    atualizarListaDeRegioes();
                    if (adapter != null) adapter.atualizarLista(new ArrayList<>(DadosClinica.patients), "");
                }
                if (position > 0 && position <= videoPatients.size()) {
                    SessaoUsuario patient = videoPatients.get(position - 1);
                    if (!patient.id.equals(openPatientId)) selecionarPacienteDosVideos(patient);
                }
            }
            @Override public void onNothingSelected(android.widget.AdapterView<?> parent) { }
        });
        binding.includePanelPro.buttonPatientPreview.setOnClickListener(v -> {
            if (openPatientId.isEmpty()) { mostrarMensagem("Selecione um paciente primeiro."); return; }
            mostrarBoneco(profile);
            patientPreview = true;
            binding.bannerMannequin.setText("Visualização de " + openPatientName + " · toque para abrir os vídeos dele");
            binding.includeMannequin.textCanvasHint.setText(R.string.canvas_hint_patient);
            binding.includeMannequin.buttonOpenPanel.setText("Voltar à edição de vídeos");
        });
        binding.includePanelPro.listPatients.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.includePanelPro.listPatients.setAdapter(adapter);

        binding.includePanelPro.tabPacientes.setOnClickListener(v -> selecionarAbaProfissional("patients"));
        binding.includePanelPro.tabArticulacoes.setOnClickListener(v -> selecionarAbaProfissional("joints"));
        binding.includePanelPro.tabCadastrar.setOnClickListener(v -> selecionarAbaProfissional("register"));
        binding.includePanelPro.tabExames.setOnClickListener(v -> selecionarAbaProfissional("exams"));
        binding.includePanelPro.tabVisao.setOnClickListener(v -> selecionarAbaProfissional("vision"));
        binding.includePanelPro.buttonCloseVision.setOnClickListener(v -> selecionarAbaProfissional("patients"));
        binding.includePanelPro.buttonRegisterPatient.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includePanelPro.buttonRegisterPatient.setOnClickListener(v -> cadastrarPaciente());
        binding.includePanelPro.buttonSaveVideo.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includePanelPro.buttonSaveVideo.setOnClickListener(v -> salvarVideoDaRegiao());
        binding.includePanelPro.buttonOpenVideo.setOnClickListener(v -> abrirVideoSelecionado());
        binding.includePanelPro.buttonClearVideo.setOnClickListener(v -> removerVideoDaRegiao());
        selecionarAbaProfissional("patients");
    }

    private void selecionarPacienteDosVideos(SessaoUsuario patient) {
        if (DadosClinica.current == null || !DadosClinica.current.ehProfissional()) return;
        String previousRegion = selectedJointId;
        openPatientId = patient.id;
        openPatientName = patient.fullName;
        patientPreview = false;
        selectedJointId = "";
        selectedJoint = "";
        binding.includePanelPro.inputYoutube.setText("");
        binding.includePanelPro.textSelectedJoint.setText(R.string.no_joint);
        binding.includePanelPro.textJointOrientation.setText(R.string.joint_orientation_hint);
        binding.includeMannequin.mannequinView.destacarRegiao("");
        binding.bannerMannequin.setText("Boneco de " + patient.fullName + " · vídeos exclusivos deste paciente");
        binding.includePanelPro.textVideosHint.setText("Editando " + patient.fullName + " · " + patient.email
                + "\nCada região tem um link próprio para este paciente. Alterações não afetam os demais.");
        binding.includePanelPro.textVideosHint.setTextColor(ContextCompat.getColor(requireContext(), R.color.maya_text_muted));
        int selectedIndex = 0;
        for (int i = 0; i < videoPatients.size(); i++) if (videoPatients.get(i).id.equals(patient.id)) selectedIndex = i + 1;
        binding.includePanelPro.spinnerVideoPatient.setSelection(selectedIndex);
        if (adapter != null) adapter.atualizarLista(new ArrayList<>(DadosClinica.patients), openPatientId);
        PontoDor previous = PontoDor.buscarPorId(previousRegion);
        if (previous != null) selecionarRegiao(previous, false);
        else atualizarListaDeRegioes();
    }

    private void configurarPainelPaciente(SessaoUsuario profile) {
        if (profile.ehProfissional()) {
            return;
        }
        ArrayAdapter<CharSequence> spinnerAdapter = ArrayAdapter.createFromResource(
                requireContext(),
                R.array.psychotherapy_options,
                android.R.layout.simple_spinner_dropdown_item
        );
        binding.includePanelPaciente.includeFicha.spinnerPsychotherapy.setAdapter(spinnerAdapter);
        binding.includePanelPaciente.includeFicha.inputFullName.setText(profile.fullName);
        binding.includePanelPaciente.tabFicha.setOnClickListener(v -> selecionarAbaPaciente("ficha"));
        binding.includePanelPaciente.tabExamesPaciente.setOnClickListener(v -> selecionarAbaPaciente("exams"));
        binding.includePanelPaciente.tabOrientacoes.setOnClickListener(v -> selecionarAbaPaciente("guide"));
        binding.includePanelPaciente.includeFicha.buttonSaveFicha.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includePanelPaciente.buttonSendExam.setBackgroundResource(R.drawable.bg_btn_primary);
        binding.includePanelPaciente.includeFicha.buttonSaveFicha.setOnClickListener(v ->
                mostrarMensagem(getString(R.string.action_save_ficha))
        );
        binding.includePanelPaciente.buttonPickFile.setOnClickListener(v ->
                mostrarMensagem(getString(R.string.action_pick_file))
        );
        binding.includePanelPaciente.buttonSendExam.setOnClickListener(v ->
                mostrarMensagem(getString(R.string.action_send_exam))
        );
        selecionarAbaPaciente("ficha");
    }

    private void mostrarBoneco(SessaoUsuario profile) {
        patientPreview = false;
        binding.includeMannequin.textCanvasHint.setText(profile.ehProfissional() ? R.string.canvas_hint_admin : R.string.canvas_hint_patient);
        binding.includeMannequin.buttonOpenPanel.setText(R.string.open_panel);
        activeScreen = "mannequin";
        binding.bannerMannequin.setVisibility(openPatientId.isEmpty() ? View.GONE : View.VISIBLE);
        binding.includeMannequin.getRoot().setVisibility(View.VISIBLE);
        binding.includePanelPro.getRoot().setVisibility(View.GONE);
        binding.includePanelPaciente.getRoot().setVisibility(View.GONE);
        binding.includeCalendar.getRoot().setVisibility(View.GONE);
        atualizarAbasPrincipais(true, profile);
    }

    private void mostrarPainel(SessaoUsuario profile) {
        if (patientPreview && profile.ehProfissional()) selecionarAbaProfissional("joints");
        patientPreview = false;
        activeScreen = "panel";
        binding.bannerMannequin.setVisibility(View.GONE);
        binding.includeMannequin.getRoot().setVisibility(View.GONE);
        binding.includePanelPro.getRoot().setVisibility(profile.ehProfissional() ? View.VISIBLE : View.GONE);
        binding.includePanelPaciente.getRoot().setVisibility(profile.ehProfissional() ? View.GONE : View.VISIBLE);
        binding.includeCalendar.getRoot().setVisibility(View.GONE);
        atualizarAbasPrincipais(false, profile);
    }

    private void atualizarAbasPrincipais(boolean mannequin, SessaoUsuario profile) {
        marcarAbaAtiva(binding.buttonCalendarTab, false);
        binding.buttonMannequinTab.setSelected(mannequin);
        binding.buttonPanelTab.setSelected(!mannequin);
        binding.buttonMannequinTab.setTextColor(ContextCompat.getColor(
                requireContext(), mannequin ? R.color.white : R.color.maya_text_muted
        ));
        binding.buttonPanelTab.setTextColor(ContextCompat.getColor(
                requireContext(), !mannequin ? R.color.white : R.color.maya_text_muted
        ));
        binding.buttonPanelTab.setText(profile.ehProfissional() ? R.string.nav_panel : R.string.nav_my_area);
    }

    private void selecionarAbaProfissional(String tab) {
        if (DadosClinica.current == null || !DadosClinica.current.ehProfissional()) return;
        binding.includePanelPro.contentPacientes.setVisibility("patients".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPro.contentArticulacoes.setVisibility("joints".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPro.contentCadastrar.setVisibility("register".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPro.contentExamesPro.setVisibility("exams".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPro.contentVisao.setVisibility("vision".equals(tab) ? View.VISIBLE : View.GONE);
        marcarAbaAtiva(binding.includePanelPro.tabPacientes, "patients".equals(tab));
        marcarAbaAtiva(binding.includePanelPro.tabArticulacoes, "joints".equals(tab));
        marcarAbaAtiva(binding.includePanelPro.tabCadastrar, "register".equals(tab));
        marcarAbaAtiva(binding.includePanelPro.tabExames, "exams".equals(tab));
        marcarAbaAtiva(binding.includePanelPro.tabVisao, "vision".equals(tab));
    }

    private void selecionarAbaPaciente(String tab) {
        binding.includePanelPaciente.contentFicha.setVisibility("ficha".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPaciente.contentExamesPaciente.setVisibility("exams".equals(tab) ? View.VISIBLE : View.GONE);
        binding.includePanelPaciente.contentOrientacoes.setVisibility("guide".equals(tab) ? View.VISIBLE : View.GONE);
        marcarAbaAtiva(binding.includePanelPaciente.tabFicha, "ficha".equals(tab));
        marcarAbaAtiva(binding.includePanelPaciente.tabExamesPaciente, "exams".equals(tab));
        marcarAbaAtiva(binding.includePanelPaciente.tabOrientacoes, "guide".equals(tab));
    }

    private void marcarAbaAtiva(Button button, boolean active) {
        button.setSelected(active);
        button.setTextColor(ContextCompat.getColor(
                requireContext(),
                active ? R.color.white : R.color.maya_text_muted
        ));
    }

    private void atualizarListaDeRegioes() {
        if (binding == null) {
            return;
        }
        if (DadosClinica.current == null || !DadosClinica.current.ehProfissional()) return;
        boolean editable = !openPatientId.isEmpty() && !selectedJointId.isEmpty();
        binding.includePanelPro.buttonPatientPreview.setEnabled(!openPatientId.isEmpty());
        binding.includePanelPro.inputYoutube.setEnabled(editable);
        binding.includePanelPro.buttonSaveVideo.setEnabled(editable);
        binding.includePanelPro.buttonClearVideo.setEnabled(editable);
        binding.includePanelPro.buttonOpenVideo.setEnabled(editable);
        GridLayout grid = binding.includePanelPro.gridJoints;
        grid.removeAllViews();
        String ownerId = obterIdDoPacienteDoBoneco();
        for (PontoDor hotspot : PontoDor.ALL) {
            View chip = LayoutInflater.from(requireContext()).inflate(R.layout.item_regiao_corpo, grid, false);
            TextView title = chip.findViewById(R.id.textJointLabel);
            TextView status = chip.findViewById(R.id.textJointStatus);
            title.setText(hotspot.label);
            chip.setAlpha(hotspot.id.equals(selectedJointId) ? 1f : .8f);
            chip.setContentDescription(hotspot.label + ". " + hotspot.region);
            status.setText(DadosClinica.temVideoNaRegiao(ownerId, hotspot.id) ? R.string.with_link : R.string.without_link);
            GridLayout.LayoutParams params = new GridLayout.LayoutParams();
            params.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
            params.width = 0;
            chip.setLayoutParams(params);
            chip.setOnClickListener(v -> selecionarRegiao(hotspot, false));
            grid.addView(chip);
        }
    }

    private void aoTocarNaRegiao(SessaoUsuario profile, PontoDor hotspot) {
        if (profile.ehProfissional() && !patientPreview) {
            if (openPatientId.isEmpty()) {
                mostrarMensagem("Abra o boneco de um paciente em Pacientes → Ver boneco.");
                return;
            }
            selecionarRegiao(hotspot, true);
            return;
        }
        binding.includeMannequin.mannequinView.destacarRegiao(hotspot.id);
        String url = DadosClinica.obterLinkDaRegiao(profile.ehProfissional() ? openPatientId : profile.id, hotspot.id);
        if (url.isEmpty()) {
            mostrarMensagem(hotspot.label + ": região selecionada. Ainda sem vídeo cadastrado.");
            return;
        }
        abrirLink(url);
    }

    private void selecionarRegiao(PontoDor hotspot, boolean openPanel) {
        if (DadosClinica.current == null || !DadosClinica.current.ehProfissional()) return;
        if (openPatientId.isEmpty()) {
            mostrarMensagem("Escolha um paciente em Pacientes → Ver boneco.");
            return;
        }
        selectedJointId = hotspot.id;
        selectedJoint = hotspot.label;
        binding.includePanelPro.textSelectedJoint.setText(hotspot.label);
        String side = hotspot.id.endsWith("_d") ? "Lado DIREITO do paciente"
                : hotspot.id.endsWith("_e") ? "Lado ESQUERDO do paciente"
                : hotspot.z < 0 ? "Parte POSTERIOR · costas" : "Parte ANTERIOR · frente";
        binding.includePanelPro.textJointOrientation.setText("Paciente: " + openPatientName + "\n"
                + hotspot.region + " · " + side + "\n" + getString(R.string.joint_orientation_hint));
        binding.includePanelPro.inputYoutube.setText(DadosClinica.obterLinkDaRegiao(obterIdDoPacienteDoBoneco(), hotspot.id));
        binding.includeMannequin.mannequinView.destacarRegiao(hotspot.id);
        atualizarListaDeRegioes();
        if (openPanel) {
            selecionarAbaProfissional("joints");
            mostrarPainel(DadosClinica.current);
        }
        binding.includePanelPro.getRoot().post(() -> binding.includePanelPro.getRoot().smoothScrollTo(0, 0));
    }

    private String obterIdDoPacienteDoBoneco() {
        if (DadosClinica.current != null && !DadosClinica.current.ehProfissional()) {
            return DadosClinica.current.id;
        }
        return openPatientId;
    }

    private void salvarVideoDaRegiao() {
        if (DadosClinica.current == null || !DadosClinica.current.ehProfissional()) return;
        if (openPatientId.isEmpty() || selectedJointId.isEmpty()) {
            mostrarMensagem(openPatientId.isEmpty()
                    ? "Abra o boneco de um paciente antes de salvar o vídeo."
                    : getString(R.string.no_joint));
            return;
        }
        String url = String.valueOf(binding.includePanelPro.inputYoutube.getText()).trim();
        if (!url.isEmpty() && !ehLinkDoYoutube(url)) {
            mostrarMensagem("Informe uma URL válida do YouTube.");
            return;
        }
        DadosClinica.salvarLinkDaRegiao(openPatientId, selectedJointId, url);
        atualizarListaDeRegioes();
        mostrarMensagem("Vídeo salvo para " + openPatientName + " · " + selectedJoint);
    }

    private void removerVideoDaRegiao() {
        if (DadosClinica.current == null || !DadosClinica.current.ehProfissional()) return;
        if (openPatientId.isEmpty() || selectedJointId.isEmpty()) {
            mostrarMensagem(getString(R.string.no_joint));
            return;
        }
        DadosClinica.salvarLinkDaRegiao(openPatientId, selectedJointId, "");
        binding.includePanelPro.inputYoutube.setText("");
        atualizarListaDeRegioes();
        mostrarMensagem("Vídeo apagado.");
    }

    private void abrirVideoSelecionado() {
        if (DadosClinica.current == null || !DadosClinica.current.ehProfissional()) return;
        String url = String.valueOf(binding.includePanelPro.inputYoutube.getText()).trim();
        if (url.isEmpty() && !selectedJointId.isEmpty()) {
            url = DadosClinica.obterLinkDaRegiao(obterIdDoPacienteDoBoneco(), selectedJointId);
        }
        if (url.isEmpty()) {
            mostrarMensagem("Cole a URL do YouTube e clique em Salvar Alteração.");
            return;
        }
        if (!ehLinkDoYoutube(url)) {
            mostrarMensagem("Informe uma URL válida do YouTube.");
            return;
        }
        abrirLink(url);
    }

    private void abrirLink(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
            mostrarMensagem("Não foi possível abrir o vídeo.");
        }
    }

    private boolean ehLinkDoYoutube(String url) {
        return DadosClinica.ehLinkValidoDoYoutube(url);
    }

    private void atualizarListaDePacientes() {
        List<SessaoUsuario> copy = new ArrayList<>(DadosClinica.patients);
        if (DadosClinica.current != null && DadosClinica.current.ehProfissional()) {
            List<String> names = new ArrayList<>();
            for (SessaoUsuario patient : copy) names.add(patient.fullName + " · " + patient.email);
            ArrayAdapter<String> options = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, names);
            options.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            binding.includeCalendar.inputAppointmentPatient.setAdapter(options);
            binding.includeCalendar.buttonAddAppointment.setEnabled(!copy.isEmpty());
            videoPatients.clear();
            videoPatients.addAll(copy);
            List<String> videoNames = new ArrayList<>();
            videoNames.add(getString(R.string.choose_video_patient));
            videoNames.addAll(names);
            ArrayAdapter<String> videoOptions = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_item, videoNames);
            videoOptions.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            binding.includePanelPro.spinnerVideoPatient.setAdapter(videoOptions);
            int selectedIndex = 0;
            for (int i = 0; i < copy.size(); i++) if (copy.get(i).id.equals(openPatientId)) selectedIndex = i + 1;
            binding.includePanelPro.spinnerVideoPatient.setSelection(selectedIndex);
        }
        binding.includePanelPro.textPatientCount.setText(String.valueOf(copy.size()));
        binding.includePanelPro.textMannequinCount.setText(String.valueOf(copy.size()));
        if (adapter != null) {
            adapter.atualizarLista(copy, openPatientId);
        }
    }

    private void cadastrarPaciente() {
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
        if (DadosClinica.ehEmailProfissional(email)) {
            message.setTextColor(ContextCompat.getColor(requireContext(), R.color.maya_danger));
            message.setText("Este e-mail é da profissional e não pode ser usado por paciente.");
            return;
        }
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            message.setTextColor(ContextCompat.getColor(requireContext(), R.color.maya_danger));
            message.setText("Informe um e-mail válido.");
            return;
        }
        try {
            DadosClinica.adicionarPaciente(name, email, password);
        } catch (IllegalArgumentException | SecurityException error) {
            message.setTextColor(ContextCompat.getColor(requireContext(), R.color.maya_danger));
            message.setText(error.getMessage());
            return;
        }
        binding.includePanelPro.inputPatientName.setText("");
        binding.includePanelPro.inputPatientEmail.setText("");
        binding.includePanelPro.inputPatientPassword.setText("");
        message.setTextColor(ContextCompat.getColor(requireContext(), R.color.maya_success));
        message.setText("Paciente " + email + " cadastrado.");
        atualizarListaDePacientes();
    }

    private void agendarConsulta() {
        int index = binding.includeCalendar.inputAppointmentPatient.getSelectedItemPosition();
        if (index < 0 || index >= DadosClinica.patients.size()) {
            mostrarMensagem("Cadastre e selecione um paciente primeiro.");
            return;
        }
        SessaoUsuario patient = DadosClinica.patients.get(index);
        String time = String.valueOf(binding.includeCalendar.inputAppointmentTime.getText()).trim();
        String notes = String.valueOf(binding.includeCalendar.inputAppointmentNotes.getText()).trim();
        try {
            DadosClinica.agendarConsulta(patient.id, patient.fullName, selectedDay, time, notes);
        } catch (IllegalArgumentException | SecurityException error) {
            mostrarMensagem(error.getMessage());
            return;
        }
        binding.includeCalendar.inputAppointmentTime.setText("");
        binding.includeCalendar.inputAppointmentNotes.setText("");
        atualizarAgendamentos(true);
        mostrarMensagem("Horário agendado.");
    }

    private void configurarCalendario(SessaoUsuario profile) {
        if (!profile.ehProfissional()) return;
        binding.includeCalendar.appointmentForm.setVisibility(profile.ehProfissional() ? View.VISIBLE : View.GONE);
        binding.includeCalendar.textCalendarLead.setText(profile.ehProfissional()
                ? R.string.calendar_lead : R.string.calendar_lead_patient);
        appointmentsAdapter = new AdaptadorAgendamentos(profile.ehProfissional() ? visit -> {
            new androidx.appcompat.app.AlertDialog.Builder(requireContext())
                    .setTitle(R.string.cancel_appointment)
                    .setMessage(visit.patientName + " · " + visit.time + "\n" + dayFormat.format(new Date(visit.dayMillis)))
                    .setNegativeButton("Voltar", null)
                    .setPositiveButton("Cancelar agendamento", (dialog, which) -> {
                        DadosClinica.cancelarAgendamento(visit.id);
                        atualizarAgendamentos(profile.ehProfissional());
                        mostrarMensagem("Agendamento cancelado.");
                    }).show();
        } : null);
        binding.includeCalendar.listAppointments.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.includeCalendar.listAppointments.setAdapter(appointmentsAdapter);
        binding.includeCalendar.calendarView.setDate(selectedDay);
        binding.includeCalendar.calendarView.setOnDateChangeListener((view, year, month, day) -> {
            java.util.Calendar date = java.util.Calendar.getInstance();
            date.set(year, month, day, 0, 0, 0);
            selectedDay = DadosClinica.inicioDoDia(date.getTimeInMillis());
            atualizarAgendamentos(profile.ehProfissional());
        });
        binding.includeCalendar.buttonToday.setOnClickListener(v -> {
            selectedDay = DadosClinica.inicioDoDia(System.currentTimeMillis());
            binding.includeCalendar.calendarView.setDate(selectedDay, true, true);
            atualizarAgendamentos(profile.ehProfissional());
        });
        binding.includeCalendar.buttonAddAppointment.setOnClickListener(v -> agendarConsulta());
        binding.includeCalendar.inputAppointmentTime.setOnClickListener(v -> {
            java.util.Calendar now = java.util.Calendar.getInstance();
            new android.app.TimePickerDialog(requireContext(), (picker, hour, minute) ->
                    binding.includeCalendar.inputAppointmentTime.setText(String.format(Locale.ROOT, "%02d:%02d", hour, minute)),
                    now.get(java.util.Calendar.HOUR_OF_DAY), now.get(java.util.Calendar.MINUTE), true).show();
        });
        atualizarAgendamentos(profile.ehProfissional());
    }

    private void mostrarCalendario(SessaoUsuario profile) {
        if (!profile.ehProfissional() || DadosClinica.current == null || !DadosClinica.current.ehProfissional()) return;
        activeScreen = "calendar";
        binding.bannerMannequin.setVisibility(View.GONE);
        binding.includeMannequin.getRoot().setVisibility(View.GONE);
        binding.includePanelPro.getRoot().setVisibility(View.GONE);
        binding.includePanelPaciente.getRoot().setVisibility(View.GONE);
        binding.includeCalendar.getRoot().setVisibility(View.VISIBLE);
        marcarAbaAtiva(binding.buttonMannequinTab, false);
        marcarAbaAtiva(binding.buttonPanelTab, false);
        marcarAbaAtiva(binding.buttonCalendarTab, true);
        atualizarAgendamentos(profile.ehProfissional());
    }

    private void atualizarAgendamentos(boolean professional) {
        if (appointmentsAdapter == null) return;
        List<AgendamentoConsulta> items = DadosClinica.listarAgendamentosDoDia(selectedDay,
                professional ? null : DadosClinica.current.id);
        binding.includeCalendar.textSelectedDay.setText(getString(R.string.calendar_day_summary,
                dayFormat.format(new Date(selectedDay)), items.size()));
        appointmentsAdapter.atualizarLista(items);
        binding.includeCalendar.textAppointmentsEmpty.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);
    }

    private void salvarDadosDeAcesso(SessaoUsuario profile) {
        String nextEmail = String.valueOf(binding.includeCredentials.inputProfileEmail.getText()).trim();
        String password = String.valueOf(binding.includeCredentials.inputProfilePassword.getText());
        String confirm = String.valueOf(binding.includeCredentials.inputProfilePasswordConfirm.getText());
        if (!password.isEmpty() && !password.equals(confirm)) {
            binding.includeCredentials.textCredentialsError.setText("A confirmação da senha não confere.");
            binding.includeCredentials.textCredentialsError.setVisibility(View.VISIBLE);
            return;
        }
        nextEmail = nextEmail.toLowerCase(Locale.ROOT);
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(nextEmail).matches()
                || (!password.isEmpty() && password.length() < 6)) {
            binding.includeCredentials.textCredentialsError.setText("Informe e-mail válido e senha com pelo menos 6 caracteres.");
            binding.includeCredentials.textCredentialsError.setVisibility(View.VISIBLE);
            return;
        }
        List<SessaoUsuario> accounts = profile.ehProfissional() ? DadosClinica.professionals : DadosClinica.patients;
        for (SessaoUsuario account : accounts) {
            if (!account.id.equals(profile.id) && nextEmail.equals(account.email)) {
                binding.includeCredentials.textCredentialsError.setText("Este e-mail já está em uso neste perfil.");
                binding.includeCredentials.textCredentialsError.setVisibility(View.VISIBLE);
                return;
            }
        }
        profile.email = nextEmail;
        if (!password.isEmpty()) {
            profile.password = password;
        }
        DadosClinica.salvarDadosNoAparelho();
        binding.includeTopbar.textProfileEmail.setText(profile.email);
        binding.includeCredentials.getRoot().setVisibility(View.GONE);
        mostrarMensagem("Dados atualizados.");
    }

    private void mostrarMensagem(String text) {
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
    public void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putLong("selectedDay", selectedDay);
        outState.putString("activeScreen", activeScreen);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (binding != null) binding.includeMannequin.mannequinView.onResume();
    }

    @Override
    public void onPause() {
        if (binding != null) binding.includeMannequin.mannequinView.onPause();
        super.onPause();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        handler.removeCallbacksAndMessages(null);
        binding = null;
    }
}
