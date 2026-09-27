const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function saveNominee(userId: string, payload: { name?: string; phone?: string; relationship?: string }) {
  const res = await fetch(`${API_BASE}/user/nominee`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, ...payload })
  });
  return res.json();
}

export async function deleteNominee(userId: string) {
  const res = await fetch(`${API_BASE}/user/nominee`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  });
  return res.json();
}

export async function getNominee(userId: string) {
  const res = await fetch(`${API_BASE}/user/nominee?user_id=${encodeURIComponent(userId)}`);
  return res.json();
}
