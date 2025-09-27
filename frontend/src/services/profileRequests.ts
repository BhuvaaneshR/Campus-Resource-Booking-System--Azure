import api from './api';

export interface ProfileRequestInput {
  name: string;
  email: string;
  department?: string;
  club?: string;
  subject?: string;
  role: 'Faculty' | 'Student Coordinator';
  mobile?: string;
  facultyId?: string;
  rollNumber?: string;
  password: string; // TEMPORARY: plaintext only for demo
}

export interface ProfileRequestItem {
  id: number;
  name: string;
  email: string;
  department?: string;
  club?: string;
  subject?: string;
  role: 'Faculty' | 'Student Coordinator';
  mobile?: string;
  facultyId?: string;
  rollNumber?: string;
  status: string;
  createdAt: string;
}

export async function submitProfileRequest(payload: ProfileRequestInput) {
  const res = await api.post('/profile-requests', payload);
  return res.data as { success: boolean; id: number };
}

export async function listProfileRequests(params?: { all?: boolean; status?: string }) {
  const query = new URLSearchParams();
  if (params?.all) query.set('all', 'true');
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  const res = await api.get(`/profile-requests${qs ? `?${qs}` : ''}`);
  return res.data as { items: ProfileRequestItem[] };
}

export async function approveProfileRequest(id: number) {
  const res = await api.post(`/profile-requests/${id}/approve`);
  return res.data as { success: boolean };
}

export async function rejectProfileRequest(id: number, reason?: string) {
  const res = await api.post(`/profile-requests/${id}/reject`, { reason });
  return res.data as { success: boolean };
}
