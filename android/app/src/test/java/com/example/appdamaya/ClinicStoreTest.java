package com.example.appdamaya;

import org.junit.After;
import org.junit.Test;
import static org.junit.Assert.*;

public class ClinicStoreTest {
    @After
    public void clearSession() {
        ClinicStore.current = null;
    }

    @Test
    public void sameEmailOpensSeparateProfiles() {
        ClinicSession professional = ClinicStore.authenticate(" ERICDELUCASS@gmail.com ", "1234", "admin");
        ClinicSession patient = ClinicStore.authenticate("ericdelucass@gmail.com", "1234", "patient");
        assertNotNull(professional);
        assertNotNull(patient);
        assertTrue(professional.isAdmin());
        assertFalse(patient.isAdmin());
        assertNotEquals(professional.id, patient.id);
        assertNull(ClinicStore.authenticate("ericdelucass@gmail.com", "wrong", "admin"));
        assertNull(ClinicStore.authenticate("ericdelucass@gmail.com", "1234", "other"));
        assertNull(ClinicStore.authenticate("mayayyamamoto@gmail.com", "123", "patient"));
    }

    @Test
    public void patientsCannotCreateAccountsOrEditLinks() {
        ClinicStore.current = ClinicStore.authenticate("ericdelucass@gmail.com", "1234", "patient");
        assertThrows(SecurityException.class, () -> ClinicStore.addPatient("Other", "other@example.com", "secret123"));
        assertThrows(SecurityException.class, () -> ClinicStore.setVideoUrl("patient-eric", "shoulder", "https://youtu.be/test"));
        ClinicStore.current = null;
        assertThrows(SecurityException.class, () -> ClinicStore.addPatient("Other", "other@example.com", "secret123"));
    }

    @Test
    public void appointmentsUsePatientIdentityAndRejectConflicts() {
        ClinicStore.current = ClinicStore.authenticate("ericdelucass@gmail.com", "1234", "admin");
        long day = ClinicStore.startOfDay(1800000000000L);
        try {
            ClinicStore.addAppointment("patient-eric", "wrong display name", day, "09:30", "Retorno");
            assertEquals("Eric", ClinicStore.appointmentsForDay(day, "patient-eric").get(0).patientName);
            assertTrue(ClinicStore.appointmentsForDay(day, "other-patient").isEmpty());
            assertThrows(IllegalArgumentException.class, () -> ClinicStore.addAppointment("patient-eric", "Eric", day, "09:30", ""));
            assertThrows(IllegalArgumentException.class, () -> ClinicStore.addAppointment("patient-eric", "Eric", day, "25:90", ""));
            assertThrows(IllegalArgumentException.class, () -> ClinicStore.addAppointment("missing", "Eric", day, "10:30", ""));
            String visitId = ClinicStore.appointmentsForDay(day, "patient-eric").get(0).id;
            ClinicStore.current = ClinicStore.authenticate("ericdelucass@gmail.com", "1234", "patient");
            assertThrows(SecurityException.class, () -> ClinicStore.cancelAppointment(visitId));
            assertThrows(SecurityException.class, () -> ClinicStore.addAppointment("patient-eric", "Eric", day, "10:30", ""));
            ClinicStore.current = ClinicStore.authenticate("ericdelucass@gmail.com", "1234", "admin");
            ClinicStore.cancelAppointment(visitId);
            assertTrue(ClinicStore.appointmentsForDay(day, "patient-eric").isEmpty());
        } finally {
            ClinicStore.appointments.removeIf(visit -> visit.dayMillis == day);
        }
    }

    @Test
    public void rejectsLinksThatOnlyImpersonateYoutube() {
        assertTrue(ClinicStore.isYoutubeUrl("https://www.youtube.com/watch?v=abc"));
        assertTrue(ClinicStore.isYoutubeUrl("https://youtu.be/abc"));
        assertFalse(ClinicStore.isYoutubeUrl("https://youtube.com.evil.example/watch?v=abc"));
        assertFalse(ClinicStore.isYoutubeUrl("https://evil.example/youtube.com"));
        assertFalse(ClinicStore.isYoutubeUrl("javascript:alert(1)"));
        assertFalse(ClinicStore.isYoutubeUrl("http://youtu.be/abc"));
    }

    @Test
    public void professionalEditsOnlySelectedPatientsLinks() {
        ClinicStore.current = ClinicStore.authenticate("ericdelucass@gmail.com", "1234", "admin");
        String joint = "test-joint";
        assertEquals("", ClinicStore.videoUrl("test-owner", joint));
        ClinicStore.setVideoUrl("test-owner", joint, " https://youtu.be/test ");
        assertEquals("https://youtu.be/test", ClinicStore.videoUrl("test-owner", joint));
        assertEquals("", ClinicStore.videoUrl("another-owner", joint));
        ClinicStore.setVideoUrl("test-owner", joint, "");
        assertEquals("", ClinicStore.videoUrl("test-owner", joint));
        assertThrows(IllegalArgumentException.class,
                () -> ClinicStore.addPatient("Duplicate", "ERICDELUCASS@gmail.com", "secret123"));
    }
}
