package com.example.appdamaya;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

public final class ClinicStore {
    public static ClinicSession current;

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
                "ericdelaxs@gmail.com",
                "Eric",
                "1234"
        ));
    }

    private ClinicStore() {}

    public static ClinicSession authenticate(String email, String password) {
        String normalized = String.valueOf(email).trim().toLowerCase(Locale.ROOT);
        String entered = String.valueOf(password);
        for (ClinicSession account : professionals) {
            if (normalized.equals(account.email) && entered.equals(account.password)) {
                return account;
            }
        }
        for (ClinicSession account : patients) {
            if (normalized.equals(account.email) && entered.equals(account.password)) {
                return account;
            }
        }
        return null;
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
        ClinicSession patient = ClinicSession.patient(
                UUID.randomUUID().toString(),
                email.trim().toLowerCase(Locale.ROOT),
                name.trim(),
                password
        );
        patients.add(0, patient);
        return patient;
    }

    public static ClinicAppointment addAppointment(
            String patientId,
            String patientName,
            long dayMillis,
            String time,
            String notes
    ) {
        ClinicAppointment item = new ClinicAppointment(
                UUID.randomUUID().toString(),
                patientId,
                patientName,
                startOfDay(dayMillis),
                time,
                notes
        );
        appointments.add(0, item);
        return item;
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
        if (patientId == null || jointId == null) {
            return;
        }
        Map<String, String> map = jointVideos.get(patientId);
        if (map == null) {
            map = new HashMap<>();
            jointVideos.put(patientId, map);
        }
        String trimmed = url == null ? "" : url.trim();
        if (trimmed.isEmpty()) {
            map.remove(jointId);
            return;
        }
        map.put(jointId, trimmed);
    }

    public static boolean hasVideo(String patientId, String jointId) {
        return !videoUrl(patientId, jointId).isEmpty();
    }
}
