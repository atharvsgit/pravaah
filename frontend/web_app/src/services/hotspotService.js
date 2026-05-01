import api from '../utils/api';

export const fetchHotspots = async () => {
  const { data } = await api.get('/reports/hotspots');
  // Normalize items
  return (data.items || []).map((h) => ({
    id: h.report_id,
    lat: h.latitude,
    lng: h.longitude,
    // normalize confidence to 0..1; backend may return 0..1 or 0..100
    confidence: (() => {
      const raw = Number(h.confidence);
      if (!isFinite(raw)) return 0;
      const val = raw > 1 ? raw / 100 : raw;
      return Math.max(0, Math.min(1, val));
    })(),
    hazardType: h.hazard_type,
    status: h.status,
    createdAt: h.created_at,
  }));
};

export const fetchRecentReports = async (limit = 10) => {
  const { data } = await api.get('/reports/recent', { params: { limit } });
  return (data.items || []).map((r) => ({
    id: r.id,
    hazard_type: r.hazard_type || 'hazard_report',
    title: r.hazard_type?.replace('_', ' ') || 'Hazard Report',
    user_description: r.user_description || '',
    status: r.status,
    created_at: r.created_at,
    user_city: r.user_city || '',
    user_name: r.user_name || 'Anonymous',
    thumbnail_url: r.thumbnail_url || null,
    latitude: r.latitude,
    longitude: r.longitude,
    location: r.location || null,
  }));
};