package com.example.appdamaya;

import org.junit.After;
import org.junit.Test;
import static org.junit.Assert.*;

public class DadosClinicaTest {
    @After
    public void clearSession() {
        DadosClinica.current = null;
    }

    @Test
    public void sameEmailOpensSeparateProfiles() {
        SessaoUsuario professional = DadosClinica.autenticar(" ERICDELUCASS@gmail.com ", "1234", "admin");
        SessaoUsuario patient = DadosClinica.autenticar("ericdelucass@gmail.com", "1234", "patient");
        assertNotNull(professional);
        assertNotNull(patient);
        assertTrue(professional.ehProfissional());
        assertFalse(patient.ehProfissional());
        assertNotEquals(professional.id, patient.id);
        assertNull(DadosClinica.autenticar("ericdelucass@gmail.com", "wrong", "admin"));
        assertNull(DadosClinica.autenticar("ericdelucass@gmail.com", "1234", "other"));
        assertNull(DadosClinica.autenticar("mayayyamamoto@gmail.com", "123", "patient"));
    }

    @Test
    public void patientsCannotCreateAccountsOrEditLinks() {
        DadosClinica.current = DadosClinica.autenticar("ericdelucass@gmail.com", "1234", "patient");
        assertThrows(SecurityException.class, () -> DadosClinica.adicionarPaciente("Other", "other@example.com", "secret123"));
        assertThrows(SecurityException.class, () -> DadosClinica.salvarLinkDaRegiao("patient-eric", "shoulder", "https://youtu.be/test"));
        DadosClinica.current = null;
        assertThrows(SecurityException.class, () -> DadosClinica.adicionarPaciente("Other", "other@example.com", "secret123"));
    }

    @Test
    public void appointmentsUsePatientIdentityAndRejectConflicts() {
        DadosClinica.current = DadosClinica.autenticar("ericdelucass@gmail.com", "1234", "admin");
        long day = DadosClinica.inicioDoDia(1800000000000L);
        try {
            DadosClinica.agendarConsulta("patient-eric", "wrong display name", day, "09:30", "Retorno");
            assertEquals("Eric", DadosClinica.listarAgendamentosDoDia(day, "patient-eric").get(0).patientName);
            assertTrue(DadosClinica.listarAgendamentosDoDia(day, "other-patient").isEmpty());
            assertThrows(IllegalArgumentException.class, () -> DadosClinica.agendarConsulta("patient-eric", "Eric", day, "09:30", ""));
            assertThrows(IllegalArgumentException.class, () -> DadosClinica.agendarConsulta("patient-eric", "Eric", day, "25:90", ""));
            assertThrows(IllegalArgumentException.class, () -> DadosClinica.agendarConsulta("missing", "Eric", day, "10:30", ""));
            String visitId = DadosClinica.listarAgendamentosDoDia(day, "patient-eric").get(0).id;
            DadosClinica.current = DadosClinica.autenticar("ericdelucass@gmail.com", "1234", "patient");
            assertThrows(SecurityException.class, () -> DadosClinica.cancelarAgendamento(visitId));
            assertThrows(SecurityException.class, () -> DadosClinica.agendarConsulta("patient-eric", "Eric", day, "10:30", ""));
            DadosClinica.current = DadosClinica.autenticar("ericdelucass@gmail.com", "1234", "admin");
            DadosClinica.cancelarAgendamento(visitId);
            assertTrue(DadosClinica.listarAgendamentosDoDia(day, "patient-eric").isEmpty());
        } finally {
            DadosClinica.appointments.removeIf(visit -> visit.dayMillis == day);
        }
    }

    @Test
    public void sameCervicalRegionKeepsDifferentVideosForEachPatient() {
        SessaoUsuario first = SessaoUsuario.patient("isolation-a", "a@example.com", "A", "");
        SessaoUsuario second = SessaoUsuario.patient("isolation-b", "b@example.com", "B", "");
        DadosClinica.current = DadosClinica.autenticar("ericdelucass@gmail.com", "1234", "admin");
        String region = "coluna_cervical";
        try {
            DadosClinica.salvarLinkDaRegiao(first.id, region, "https://youtu.be/exerciseA");
            DadosClinica.salvarLinkDaRegiao(second.id, region, "https://youtu.be/exerciseB");
            DadosClinica.current = first;
            assertEquals("https://youtu.be/exerciseA", DadosClinica.obterLinkDaRegiao(first.id, region));
            assertEquals("", DadosClinica.obterLinkDaRegiao(second.id, region));
            DadosClinica.current = second;
            assertEquals("https://youtu.be/exerciseB", DadosClinica.obterLinkDaRegiao(second.id, region));
            assertEquals("", DadosClinica.obterLinkDaRegiao(first.id, region));
            DadosClinica.current = DadosClinica.autenticar("ericdelucass@gmail.com", "1234", "admin");
            DadosClinica.salvarLinkDaRegiao(first.id, region, "");
            assertEquals("https://youtu.be/exerciseB", DadosClinica.obterLinkDaRegiao(second.id, region));
        } finally {
            DadosClinica.current = DadosClinica.autenticar("ericdelucass@gmail.com", "1234", "admin");
            DadosClinica.salvarLinkDaRegiao(first.id, region, "");
            DadosClinica.salvarLinkDaRegiao(second.id, region, "");
        }
    }

    @Test
    public void rejectsLinksThatOnlyImpersonateYoutube() {
        assertTrue(DadosClinica.ehLinkValidoDoYoutube("https://www.youtube.com/watch?v=abc"));
        assertTrue(DadosClinica.ehLinkValidoDoYoutube("https://youtu.be/abc"));
        assertFalse(DadosClinica.ehLinkValidoDoYoutube("https://youtube.com.evil.example/watch?v=abc"));
        assertFalse(DadosClinica.ehLinkValidoDoYoutube("https://evil.example/youtube.com"));
        assertFalse(DadosClinica.ehLinkValidoDoYoutube("javascript:alert(1)"));
        assertFalse(DadosClinica.ehLinkValidoDoYoutube("http://youtu.be/abc"));
    }

    @Test
    public void professionalEditsOnlySelectedPatientsLinks() {
        DadosClinica.current = DadosClinica.autenticar("ericdelucass@gmail.com", "1234", "admin");
        String joint = "test-joint";
        assertEquals("", DadosClinica.obterLinkDaRegiao("test-owner", joint));
        DadosClinica.salvarLinkDaRegiao("test-owner", joint, " https://youtu.be/test ");
        assertEquals("https://youtu.be/test", DadosClinica.obterLinkDaRegiao("test-owner", joint));
        assertEquals("", DadosClinica.obterLinkDaRegiao("another-owner", joint));
        DadosClinica.salvarLinkDaRegiao("test-owner", joint, "");
        assertEquals("", DadosClinica.obterLinkDaRegiao("test-owner", joint));
        assertThrows(IllegalArgumentException.class,
                () -> DadosClinica.adicionarPaciente("Duplicate", "ERICDELUCASS@gmail.com", "secret123"));
    }
}
