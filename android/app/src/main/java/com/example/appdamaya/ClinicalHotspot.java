package com.example.appdamaya;

public final class ClinicalHotspot {
    public final String id;
    public final String label;
    public final String region;
    public final float x;
    public final float y;
    public final float z;

    public ClinicalHotspot(String id, String label, String region, float x, float y, float z) {
        this.id = id;
        this.label = label;
        this.region = region;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public static final ClinicalHotspot[] ALL = {
            new ClinicalHotspot("ombro_d", "Ombro Direito", "Membros Superiores", -0.34f, 1.39f, 0f),
            new ClinicalHotspot("ombro_e", "Ombro Esquerdo", "Membros Superiores", 0.34f, 1.39f, 0f),
            new ClinicalHotspot("cotovelo_d", "Cotovelo Direito", "Membros Superiores", -0.58f, 1.02f, 0f),
            new ClinicalHotspot("cotovelo_e", "Cotovelo Esquerdo", "Membros Superiores", 0.58f, 1.02f, 0f),
            new ClinicalHotspot("punho_d", "Punho Direito", "Membros Superiores", -0.66f, 0.62f, 0f),
            new ClinicalHotspot("punho_e", "Punho Esquerdo", "Membros Superiores", 0.66f, 0.62f, 0f),
            new ClinicalHotspot("pescoco_posterior", "Pescoço (nuca)", "Coluna", 0f, 1.52f, -0.145f),
            new ClinicalHotspot("coluna_cervical", "Costas altas / Cervical", "Coluna", 0f, 1.40f, -0.148f),
            new ClinicalHotspot("coluna_lombar", "Costas baixas / Lombar", "Coluna", 0f, 0.95f, -0.108f),
            new ClinicalHotspot("lombo_sacra", "Lombo-sacra", "Coluna", 0f, 0.58f, -0.12f),
            new ClinicalHotspot("epigastrio", "Tórax / Abdômen (frente)", "Tronco", 0f, 1.08f, 0.145f),
            new ClinicalHotspot("quadril_d", "Quadril Direito", "Membros Inferiores", -0.18f, 0.48f, 0f),
            new ClinicalHotspot("quadril_e", "Quadril Esquerdo", "Membros Inferiores", 0.18f, 0.48f, 0f),
            new ClinicalHotspot("joelho_d", "Joelho Direito", "Membros Inferiores", -0.23f, -0.08f, 0f),
            new ClinicalHotspot("joelho_e", "Joelho Esquerdo", "Membros Inferiores", 0.23f, -0.08f, 0f),
            new ClinicalHotspot("tornozelo_d", "Tornozelo Direito", "Membros Inferiores", -0.24f, -0.72f, 0f),
            new ClinicalHotspot("tornozelo_e", "Tornozelo Esquerdo", "Membros Inferiores", 0.24f, -0.72f, 0f),
    };

    public static ClinicalHotspot byId(String id) {
        for (ClinicalHotspot item : ALL) {
            if (item.id.equals(id)) {
                return item;
            }
        }
        return null;
    }
}
