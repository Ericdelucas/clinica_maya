import { getSupabaseClient } from './supabase.js';

export async function fetchClinicalHotspots() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clinical_hotspots')
    .select('id, label, region, position, video_url');

  if (error) throw error;
  return data || [];
}

export async function updateClinicalHotspotVideo(hotspotId, videoUrl) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clinical_hotspots')
    .update({
      video_url: String(videoUrl || '').trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', hotspotId)
    .select('id, video_url')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Nenhuma articulação foi atualizada no banco. Confirme o ID e o perfil admin.');
  }
  return data;
}

export function subscribeClinicalHotspots(onChange) {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel('clinical-hotspots-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'clinical_hotspots' },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
