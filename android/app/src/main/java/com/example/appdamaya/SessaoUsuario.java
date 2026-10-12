package com.example.appdamaya;

public final class SessaoUsuario {
    public String id;
    public String email;
    public String fullName;
    public String role;
    public String password;

    public boolean ehProfissional() {
        return "admin".equals(role);
    }

    public static SessaoUsuario professional(String id, String email, String fullName, String password) {
        SessaoUsuario session = new SessaoUsuario();
        session.id = id;
        session.email = email;
        session.fullName = fullName;
        session.role = "admin";
        session.password = password;
        return session;
    }

    public static SessaoUsuario patient(String id, String email, String fullName, String password) {
        SessaoUsuario session = new SessaoUsuario();
        session.id = id;
        session.email = email;
        session.fullName = fullName;
        session.role = "patient";
        session.password = password;
        return session;
    }
}
