package com.example.appdamaya;

public final class PontoDor {
    public final String id;
    public final String label;
    public final String region;
    public final float x;
    public final float y;
    public final float z;

    public PontoDor(String id, String label, String region, float x, float y, float z) {
        this.id = id;
        this.label = label;
        this.region = region;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public static final PontoDor[] ALL = {
            new PontoDor("ombro_d", "Ombro Direito", "Membros Superiores", -0.34f, 1.39f, 0f),
            new PontoDor("ombro_e", "Ombro Esquerdo", "Membros Superiores", 0.34f, 1.39f, 0f),
            new PontoDor("cotovelo_d", "Cotovelo Direito", "Membros Superiores", -0.58f, 1.02f, 0f),
            new PontoDor("cotovelo_e", "Cotovelo Esquerdo", "Membros Superiores", 0.58f, 1.02f, 0f),
            new PontoDor("punho_d", "Punho Direito", "Membros Superiores", -0.66f, 0.62f, 0f),
            new PontoDor("punho_e", "Punho Esquerdo", "Membros Superiores", 0.66f, 0.62f, 0f),
            new PontoDor("pescoco_posterior", "Pescoço (nuca)", "Coluna", 0f, 1.52f, -0.145f),
            new PontoDor("coluna_cervical", "Costas altas / Cervical", "Coluna", 0f, 1.40f, -0.148f),
            new PontoDor("coluna_lombar", "Costas baixas / Lombar", "Coluna", 0f, 0.95f, -0.108f),
            new PontoDor("lombo_sacra", "Lombo-sacra", "Coluna", 0f, 0.58f, -0.12f),
            new PontoDor("epigastrio", "Tórax / Abdômen (frente)", "Tronco", 0f, 1.08f, 0.145f),
            new PontoDor("quadril_d", "Quadril Direito", "Membros Inferiores", -0.18f, 0.48f, 0f),
            new PontoDor("quadril_e", "Quadril Esquerdo", "Membros Inferiores", 0.18f, 0.48f, 0f),
            new PontoDor("joelho_d", "Joelho Direito", "Membros Inferiores", -0.23f, -0.08f, 0f),
            new PontoDor("joelho_e", "Joelho Esquerdo", "Membros Inferiores", 0.23f, -0.08f, 0f),
            new PontoDor("tornozelo_d", "Tornozelo Direito", "Membros Inferiores", -0.24f, -0.72f, 0f),
            new PontoDor("tornozelo_e", "Tornozelo Esquerdo", "Membros Inferiores", 0.24f, -0.72f, 0f),
    };

    public static PontoDor buscarPorId(String id) {
        for (PontoDor item : ALL) {
            if (item.id.equals(id)) {
                return item;
            }
        }
        return null;
    }
}
