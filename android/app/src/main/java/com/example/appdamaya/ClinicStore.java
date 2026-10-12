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

public final class ClinicStore {
    public static ClinicSession current;
    private static SharedPreferences preferences;

    public static final List<ClinicSession> professionals = new ArrayList<>();
    public static final List<ClinicSession> patients = new ArrayList<>();
    public static final List<ClinicAppointment> appointments = new ArrayList<>();
    private static final Map<String, Map<String, String>> jointVideos = new HashMap<>();

    static {
        professionals.add(ClinicSession.professional(
                "professional-maya",
                "mayayyamamoto@gmail.com",
                "Maya Yamamoto",
                "123"
        ));
        professionals.add(ClinicSession.professional(
                "professional-eric",
                "ericdelucass@gmail.com",
                "Eric",
                "1234"
        ));
        patients.add(ClinicSession.patient(
                "patient-eric",
                "ericdelucass@gmail.com",
                "Eric",
                "1234"
        ));
    }

    private ClinicStore() {}

    // Local prototype: accounts are stored only in this app's private storage.
    public static void initialize(Context context) {
        if (preferences != null) return;
        preferences = context.getApplicationContext().getSharedPreferences("clinic_store", Context.MODE_PRIVATE);
        String saved = preferences.getString("accounts_and_videos", null);
        if (saved == null) return;
        try {
            JSONObject root = new JSONObject(saved);
            List<ClinicSession> loadedProfessionals = decodeAccounts(root.getJSONArray("professionals"), true);
            List<ClinicSession> loadedPatients = decodeAccounts(root.getJSONArray("patients"), false);
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
            List<ClinicAppointment> loadedAppointments = new ArrayList<>();
            JSONArray savedAppointments = root.optJSONArray("appointments");
            if (savedAppointments != null) for (int i = 0; i < savedAppointments.length(); i++) {
                JSONObject row = savedAppointments.getJSONObject(i);
                loadedAppointments.add(new ClinicAppointment(row.getString("id"), row.getString("patientId"),
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
    }

    private static List<ClinicSession> decodeAccounts(JSONArray rows, boolean professional) throws JSONException {
        List<ClinicSession> accounts = new ArrayList<>();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.getJSONObject(i);
            accounts.add(professional
                    ? ClinicSession.professional(row.getString("id"), row.getString("email"), row.getString("name"), row.getString("password"))
                    : ClinicSession.patient(row.getString("id"), row.getString("email"), row.getString("name"), row.getString("password")));
        }
        return accounts;
    }

    private static JSONArray encodeAccounts(List<ClinicSession> accounts) throws JSONException {
        JSONArray rows = new JSONArray();
        for (ClinicSession account : accounts) {
            JSONObject row = new JSONObject();
            row.put("id", account.id);
            row.put("email", account.email);
            row.put("name", account.fullName);
            row.put("password", account.password);
            rows.put(row);
        }
        return rows;
    }

    public static void persist() {
        if (preferences == null) return;
        try {
            JSONObject root = new JSONObject();
            root.put("professionals", encodeAccounts(professionals));
            root.put("patients", encodeAccounts(patients));
            JSONObject videos = new JSONObject();
            for (Map.Entry<String, Map<String, String>> entry : jointVideos.entrySet()) {
                videos.put(entry.getKey(), new JSONObject(entry.getValue()));
            }
            root.put("videos", videos);
            JSONArray visits = new JSONArray();
            for (ClinicAppointment visit : appointments) {
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

    public static ClinicSession authenticate(String email, String password, String role) {
        String normalized = String.valueOf(email).trim().toLowerCase(Locale.ROOT);
        String entered = String.valueOf(password);
        List<ClinicSession> accounts;
        if ("admin".equals(role)) accounts = professionals;
        else if ("patient".equals(role)) accounts = patients;
        else return null;
        for (ClinicSession account : accounts) {
            if (normalized.equals(account.email) && entered.equals(account.password)) {
                return account;
            }
        }
        return null;
    }

    /** Temporary local access for exploring the app without credentials. */
    public static ClinicSession testProfile(String role) {
        if (!"admin".equals(role) && !"patient".equals(role)) {
            throw new IllegalArgumentException("Perfil de teste inválido.");
        }
        boolean professional = "admin".equals(role);
        if (professional) testProfile("patient");
        String id = professional ? "test-professional" : "test-patient";
        List<ClinicSession> accounts = professional ? professionals : patients;
        for (ClinicSession account : accounts) {
            if (id.equals(account.id)) return account;
        }
        ClinicSession profile = professional
                ? ClinicSession.professional(id, "teste@example.com", "Teste", "")
                : ClinicSession.patient(id, "teste@example.com", "Teste", "");
        accounts.add(profile);
        persist();
        return profile;
    }

    private static void requireProfessional() {
        if (current == null || !current.isAdmin()) {
            throw new SecurityException("Apenas a profissional pode realizar esta alteração.");
        }
    }

    public static boolean isProfessionalEmail(String email) {
        String normalized = String.valueOf(email).trim().toLowerCase(Locale.ROOT);
        for (ClinicSession account : professionals) {
            if (normalized.equals(account.email)) {
                return true;
            }
        }
        return false;
    }

    public static ClinicSession addPatient(String name, String email, String password) {
        requireProfessional();
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        for (ClinicSession existing : patients) {
            if (normalized.equals(existing.email)) {
                throw new IllegalArgumentException("Já existe um paciente com este e-mail.");
            }
        }
        ClinicSession patient = ClinicSession.patient(
                UUID.randomUUID().toString(),
                email.trim().toLowerCase(Locale.ROOT),
                name.trim(),
                password
        );
        patients.add(0, patient);
        persist();
        return patient;
    }

    public static ClinicAppointment addAppointment(
            String patientId,
            String patientName,
            long dayMillis,
            String time,
            String notes
    ) {
        requireProfessional();
        ClinicSession patient = null;
        for (ClinicSession account : patients) if (account.id.equals(patientId)) patient = account;
        if (patient == null) throw new IllegalArgumentException("Selecione um paciente cadastrado.");
        if (time == null || !time.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]")) {
            throw new IllegalArgumentException("Informe um horário válido no formato HH:mm.");
        }
        long day = startOfDay(dayMillis);
        for (ClinicAppointment visit : appointments) {
            if (visit.dayMillis == day && visit.time.equals(time)) {
                throw new IllegalArgumentException("Este horário já está agendado.");
            }
        }
        ClinicAppointment item = new ClinicAppointment(
                UUID.randomUUID().toString(),
                patientId,
                patient.fullName,
                day,
                time,
                notes
        );
        appointments.add(0, item);
        persist();
        return item;
    }

    public static void cancelAppointment(String appointmentId) {
        requireProfessional();
        appointments.removeIf(visit -> visit.id.equals(appointmentId));
        persist();
    }

    public static List<ClinicAppointment> appointmentsForDay(long dayMillis, String patientId) {
        long day = startOfDay(dayMillis);
        List<ClinicAppointment> result = new ArrayList<>();
        for (ClinicAppointment item : appointments) {
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

    public static long startOfDay(long millis) {
        java.util.Calendar calendar = java.util.Calendar.getInstance();
        calendar.setTimeInMillis(millis);
        calendar.set(java.util.Calendar.HOUR_OF_DAY, 0);
        calendar.set(java.util.Calendar.MINUTE, 0);
        calendar.set(java.util.Calendar.SECOND, 0);
        calendar.set(java.util.Calendar.MILLISECOND, 0);
        return calendar.getTimeInMillis();
    }

    public static String videoUrl(String patientId, String jointId) {
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

    public static void setVideoUrl(String patientId, String jointId, String url) {
        requireProfessional();
        if (patientId == null || jointId == null) {
            return;
        }
        Map<String, String> map = jointVideos.get(patientId);
        if (map == null) {
            map = new HashMap<>();
            jointVideos.put(patientId, map);
        }
        String trimmed = url == null ? "" : url.trim();
        if (!trimmed.isEmpty() && !isYoutubeUrl(trimmed)) {
            throw new IllegalArgumentException("Informe um link HTTPS válido do YouTube.");
        }
        if (trimmed.isEmpty()) {
            map.remove(jointId);
            persist();
            return;
        }
        map.put(jointId, trimmed);
        persist();
    }

    public static boolean isYoutubeUrl(String url) {
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

    public static boolean hasVideo(String patientId, String jointId) {
        return !videoUrl(patientId, jointId).isEmpty();
    }
}
