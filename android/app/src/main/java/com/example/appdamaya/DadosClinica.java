package com.example.appdamaya;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

public final class DadosClinica {
    public static SessaoUsuario current;
    private static SharedPreferences preferences;

    public static final List<SessaoUsuario> professionals = new ArrayList<>();
    public static final List<SessaoUsuario> patients = new ArrayList<>();
    public static final List<AgendamentoConsulta> appointments = new ArrayList<>();
    private static final Map<String, Map<String, String>> jointVideos = new HashMap<>();

    static {
        professionals.add(SessaoUsuario.professional(
                "professional-maya",
                "mayayyamamoto@gmail.com",
                "Maya Yamamoto",
                "123"
        ));
        professionals.add(SessaoUsuario.professional(
                "professional-eric",
                "ericdelucass@gmail.com",
                "Eric",
                "1234"
        ));
        patients.add(SessaoUsuario.patient(
                "patient-eric",
                "ericdelucass@gmail.com",
                "Eric",
                "1234"
        ));
    }

    private DadosClinica() {}

    // Local prototype: accounts are stored only in this app's private storage.
    public static void inicializar(Context context) {
        if (preferences != null) return;
        preferences = context.getApplicationContext().getSharedPreferences("clinic_store", Context.MODE_PRIVATE);
        String saved = preferences.getString("accounts_and_videos", null);
        if (saved == null) { criarPacientesDeExemplo(); return; }
        try {
            JSONObject root = new JSONObject(saved);
            List<SessaoUsuario> loadedProfessionals = lerContasSalvas(root.getJSONArray("professionals"), true);
            List<SessaoUsuario> loadedPatients = lerContasSalvas(root.getJSONArray("patients"), false);
            Map<String, Map<String, String>> loadedVideos = new HashMap<>();
            JSONObject videos = root.getJSONObject("videos");
            java.util.Iterator<String> owners = videos.keys();
            while (owners.hasNext()) {
                String owner = owners.next();
                JSONObject joints = videos.getJSONObject(owner);
                Map<String, String> links = new HashMap<>();
                java.util.Iterator<String> keys = joints.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    links.put(key, joints.getString(key));
                }
                loadedVideos.put(owner, links);
            }
            List<AgendamentoConsulta> loadedAppointments = new ArrayList<>();
            JSONArray savedAppointments = root.optJSONArray("appointments");
            if (savedAppointments != null) for (int i = 0; i < savedAppointments.length(); i++) {
                JSONObject row = savedAppointments.getJSONObject(i);
                loadedAppointments.add(new AgendamentoConsulta(row.getString("id"), row.getString("patientId"),
                        row.getString("patientName"), row.getLong("day"), row.getString("time"), row.optString("notes")));
            }
            appointments.clear();
            appointments.addAll(loadedAppointments);
            professionals.clear();
            professionals.addAll(loadedProfessionals);
            patients.clear();
            patients.addAll(loadedPatients);
            jointVideos.clear();
            jointVideos.putAll(loadedVideos);
        } catch (JSONException ignored) {
            // Keep the initial accounts if the saved snapshot is invalid.
        }
        criarPacientesDeExemplo();
    }

    public static void criarPacientesDeExemplo() {
        criarPacienteDeExemplo("example-ana", "ana.souza@example.com", "Ana Souza (exemplo)",
                "https://www.youtube.com/watch?v=aqz-KE-bpKQ", "https://www.youtube.com/watch?v=OHOpb2fS-cM");
        criarPacienteDeExemplo("example-bruno", "bruno.lima@example.com", "Bruno Lima (exemplo)",
                "https://www.youtube.com/watch?v=OHOpb2fS-cM", "https://www.youtube.com/watch?v=aqz-KE-bpKQ");
        salvarDadosNoAparelho();
    }

    private static void criarPacienteDeExemplo(String id, String email, String name, String cervical, String shoulder) {
        for (SessaoUsuario patient : patients) if (id.equals(patient.id)) return;
        patients.add(SessaoUsuario.patient(id, email, name, ""));
        Map<String, String> videos = new HashMap<>();
        videos.put("coluna_cervical", cervical);
        videos.put("ombro_d", shoulder);
        jointVideos.put(id, videos);
    }

    private static List<SessaoUsuario> lerContasSalvas(JSONArray rows, boolean professional) throws JSONException {
        List<SessaoUsuario> accounts = new ArrayList<>();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.getJSONObject(i);
            accounts.add(professional
                    ? SessaoUsuario.professional(row.getString("id"), row.getString("email"), row.getString("name"), row.getString("password"))
                    : SessaoUsuario.patient(row.getString("id"), row.getString("email"), row.getString("name"), row.getString("password")));
        }
        return accounts;
    }

    private static JSONArray converterContasParaSalvar(List<SessaoUsuario> accounts) throws JSONException {
        JSONArray rows = new JSONArray();
        for (SessaoUsuario account : accounts) {
            JSONObject row = new JSONObject();
            row.put("id", account.id);
            row.put("email", account.email);
            row.put("name", account.fullName);
            row.put("password", account.password);
            rows.put(row);
        }
        return rows;
    }

    public static void salvarDadosNoAparelho() {
        if (preferences == null) return;
        try {
            JSONObject root = new JSONObject();
            root.put("professionals", converterContasParaSalvar(professionals));
            root.put("patients", converterContasParaSalvar(patients));
            JSONObject videos = new JSONObject();
            for (Map.Entry<String, Map<String, String>> entry : jointVideos.entrySet()) {
                videos.put(entry.getKey(), new JSONObject(entry.getValue()));
            }
            root.put("videos", videos);
            JSONArray visits = new JSONArray();
            for (AgendamentoConsulta visit : appointments) {
                JSONObject row = new JSONObject();
                row.put("id", visit.id); row.put("patientId", visit.patientId);
                row.put("patientName", visit.patientName); row.put("day", visit.dayMillis);
                row.put("time", visit.time); row.put("notes", visit.notes);
                visits.put(row);
            }
            root.put("appointments", visits);
            preferences.edit().putString("accounts_and_videos", root.toString()).apply();
        } catch (JSONException error) {
            throw new IllegalStateException("Não foi possível salvar os dados locais.", error);
        }
    }

    public static SessaoUsuario autenticar(String email, String password, String role) {
        String normalized = String.valueOf(email).trim().toLowerCase(Locale.ROOT);
        String entered = String.valueOf(password);
        List<SessaoUsuario> accounts;
        if ("admin".equals(role)) accounts = professionals;
        else if ("patient".equals(role)) accounts = patients;
        else return null;
        for (SessaoUsuario account : accounts) {
            if (normalized.equals(account.email) && entered.equals(account.password)) {
                return account;
            }
        }
        return null;
    }

    /** Temporary local access for exploring the app without credentials. */
    public static SessaoUsuario obterPerfilTeste(String role) {
        if (!"admin".equals(role) && !"patient".equals(role)) {
            throw new IllegalArgumentException("Perfil de teste inválido.");
        }
        boolean professional = "admin".equals(role);
        if (professional) obterPerfilTeste("patient");
        String id = professional ? "test-professional" : "test-patient";
        List<SessaoUsuario> accounts = professional ? professionals : patients;
        for (SessaoUsuario account : accounts) {
            if (id.equals(account.id)) return account;
        }
        SessaoUsuario profile = professional
                ? SessaoUsuario.professional(id, "teste@example.com", "Teste", "")
                : SessaoUsuario.patient(id, "teste@example.com", "Teste", "");
        accounts.add(profile);
        salvarDadosNoAparelho();
        return profile;
    }

    private static void exigirProfissional() {
        if (current == null || !current.ehProfissional()) {
            throw new SecurityException("Apenas a profissional pode realizar esta alteração.");
        }
    }

    public static boolean ehEmailProfissional(String email) {
        String normalized = String.valueOf(email).trim().toLowerCase(Locale.ROOT);
        for (SessaoUsuario account : professionals) {
            if (normalized.equals(account.email)) {
                return true;
            }
        }
        return false;
    }

    public static SessaoUsuario adicionarPaciente(String name, String email, String password) {
        exigirProfissional();
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        for (SessaoUsuario existing : patients) {
            if (normalized.equals(existing.email)) {
                throw new IllegalArgumentException("Já existe um paciente com este e-mail.");
            }
        }
        SessaoUsuario patient = SessaoUsuario.patient(
                UUID.randomUUID().toString(),
                email.trim().toLowerCase(Locale.ROOT),
                name.trim(),
                password
        );
        patients.add(0, patient);
        salvarDadosNoAparelho();
        return patient;
    }

    public static AgendamentoConsulta agendarConsulta(
            String patientId,
            String patientName,
            long dayMillis,
            String time,
            String notes
    ) {
        exigirProfissional();
        SessaoUsuario patient = null;
        for (SessaoUsuario account : patients) if (account.id.equals(patientId)) patient = account;
        if (patient == null) throw new IllegalArgumentException("Selecione um paciente cadastrado.");
        if (time == null || !time.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]")) {
            throw new IllegalArgumentException("Informe um horário válido no formato HH:mm.");
        }
        long day = inicioDoDia(dayMillis);
        for (AgendamentoConsulta visit : appointments) {
            if (visit.dayMillis == day && visit.time.equals(time)) {
                throw new IllegalArgumentException("Este horário já está agendado.");
            }
        }
        AgendamentoConsulta item = new AgendamentoConsulta(
                UUID.randomUUID().toString(),
                patientId,
                patient.fullName,
                day,
                time,
                notes
        );
        appointments.add(0, item);
        salvarDadosNoAparelho();
        return item;
    }

    public static void cancelarAgendamento(String appointmentId) {
        exigirProfissional();
        appointments.removeIf(visit -> visit.id.equals(appointmentId));
        salvarDadosNoAparelho();
    }

    public static List<AgendamentoConsulta> listarAgendamentosDoDia(long dayMillis, String patientId) {
        long day = inicioDoDia(dayMillis);
        List<AgendamentoConsulta> result = new ArrayList<>();
        for (AgendamentoConsulta item : appointments) {
            if (item.dayMillis != day) {
                continue;
            }
            if (patientId != null && !patientId.equals(item.patientId)) {
                continue;
            }
            result.add(item);
        }
        result.sort((a, b) -> a.time.compareTo(b.time));
        return result;
    }

    public static long inicioDoDia(long millis) {
        java.util.Calendar calendar = java.util.Calendar.getInstance();
        calendar.setTimeInMillis(millis);
        calendar.set(java.util.Calendar.HOUR_OF_DAY, 0);
        calendar.set(java.util.Calendar.MINUTE, 0);
        calendar.set(java.util.Calendar.SECOND, 0);
        calendar.set(java.util.Calendar.MILLISECOND, 0);
        return calendar.getTimeInMillis();
    }

    public static String obterLinkDaRegiao(String patientId, String jointId) {
        if (current != null && !current.ehProfissional() && !current.id.equals(patientId)) return "";
        if (patientId == null || jointId == null) {
            return "";
        }
        Map<String, String> map = jointVideos.get(patientId);
        if (map == null) {
            return "";
        }
        String url = map.get(jointId);
        return url == null ? "" : url;
    }

    public static void salvarLinkDaRegiao(String patientId, String jointId, String url) {
        exigirProfissional();
        if (patientId == null || jointId == null) {
            return;
        }
        Map<String, String> map = jointVideos.get(patientId);
        if (map == null) {
            map = new HashMap<>();
            jointVideos.put(patientId, map);
        }
        String trimmed = url == null ? "" : url.trim();
        if (!trimmed.isEmpty() && !ehLinkValidoDoYoutube(trimmed)) {
            throw new IllegalArgumentException("Informe um link HTTPS válido do YouTube.");
        }
        if (trimmed.isEmpty()) {
            map.remove(jointId);
            salvarDadosNoAparelho();
            return;
        }
        map.put(jointId, trimmed);
        salvarDadosNoAparelho();
    }

    public static boolean ehLinkValidoDoYoutube(String url) {
        try {
            java.net.URI parsed = new java.net.URI(url);
            String host = parsed.getHost();
            if (host == null || !"https".equalsIgnoreCase(parsed.getScheme())) return false;
            host = host.toLowerCase(Locale.ROOT);
            return "youtube.com".equals(host) || host.endsWith(".youtube.com")
                    || "youtu.be".equals(host);
        } catch (java.net.URISyntaxException | NullPointerException error) {
            return false;
        }
    }

    public static boolean temVideoNaRegiao(String patientId, String jointId) {
        return !obterLinkDaRegiao(patientId, jointId).isEmpty();
    }
}
