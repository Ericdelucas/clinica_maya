package com.example.appdamaya;

public final class ClinicSession {
    public String id;
    public String email;
    public String fullName;
    public String role;
    public String password;

    public boolean isAdmin() {
        return "admin".equals(role);
    }

    public static ClinicSession professional(String id, String email, String fullName, String password) {
        ClinicSession session = new ClinicSession();
        session.id = id;
        session.email = email;
        session.fullName = fullName;
        session.role = "admin";
        session.password = password;
        return session;
    }

    public static ClinicSession patient(String id, String email, String fullName, String password) {
        ClinicSession session = new ClinicSession();
        session.id = id;
        session.email = email;
        session.fullName = fullName;
        session.role = "patient";
        session.password = password;
        return session;
    }
}
