const API_BASE = 'http://localhost:3001/api/teams';

export interface Subteam {
  id: string;
  name: string;
  fastApiRunId: string | null;
  djangoEventLogId: string | null;
  createdAt?: string;
}

export interface TeamMembership {
  id: string;
  name: string;
  role: 'admin' | 'member';
  memberCount: number;
  isCreator: boolean;
  createdAt: string;
  subteams: Subteam[];
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

class TeamService {
  async create(payload: { name: string; joinPassword: string; confirmPassword: string }) {
    const res = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; message: string; data: TeamMembership }>(res);
  }

  async join(payload: { name: string; joinPassword: string }) {
    const res = await fetch(`${API_BASE}/join`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; message: string; data: TeamMembership }>(res);
  }

  async getMyTeams() {
    const res = await fetch(`${API_BASE}/my-teams`, { headers: authHeaders() });
    return handleResponse<{ success: boolean; data: TeamMembership[] }>(res);
  }

  async deleteTeam(id: string) {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: authHeaders() });
    return handleResponse<{ success: boolean; message: string }>(res);
  }

  async createSubteam(teamId: string, name: string) {
    const res = await fetch(`${API_BASE}/${teamId}/subteams`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
    return handleResponse<{ success: boolean; message: string; data: Subteam }>(res);
  }

  async deleteSubteam(teamId: string, subId: string) {
    const res = await fetch(`${API_BASE}/${teamId}/subteams/${subId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  }

  async updateSubteamData(teamId: string, subId: string, payload: { fastApiRunId?: string; djangoEventLogId?: string }) {
    const res = await fetch(`${API_BASE}/${teamId}/subteams/${subId}/data`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; data: { fastApiRunId: string; djangoEventLogId: string } }>(res);
  }

  async getSubteam(teamId: string, subId: string) {
    const res = await fetch(`${API_BASE}/${teamId}/subteams/${subId}`, { headers: authHeaders() });
    return handleResponse<{ success: boolean; data: Subteam & { teamId: string; teamName: string } }>(res);
  }

  async getAdminTelegram(teamId: string) {
    const res = await fetch(`${API_BASE}/${teamId}/admin-telegram`, { headers: authHeaders() });
    return handleResponse<{ success: boolean; data: { hasTelegram: boolean; chatId: string | null; adminName: string } }>(res);
  }

  async sendTelegramReport(teamId: string, payload: {
    reportMarkdown: string;
    teamName: string;
    subteamName: string;
    senderName: string;
  }) {
    const res = await fetch(`${API_BASE}/${teamId}/send-telegram-report`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  }
}

const teamService = new TeamService();
export default teamService;

// ── localStorage helpers ────────────────────────────────────────────────────

export interface SubteamContext {
  teamId: string;
  teamName: string;
  subteamId: string;
  subteamName: string;
  fastApiRunId: string | null;
  djangoEventLogId: string | null;
  teamRole: 'admin' | 'member';
}

export function saveSubteamContext(ctx: SubteamContext) {
  localStorage.setItem('p2p_team_id', ctx.teamId);
  localStorage.setItem('p2p_team_name', ctx.teamName);
  localStorage.setItem('p2p_subteam_id', ctx.subteamId);
  localStorage.setItem('p2p_subteam_name', ctx.subteamName);
  localStorage.setItem('p2p_fast_api_run_id', ctx.fastApiRunId || '');
  localStorage.setItem('p2p_django_event_log_id', ctx.djangoEventLogId || '');
  localStorage.setItem('p2p_team_role', ctx.teamRole);
}

export function readSubteamContext(): SubteamContext | null {
  const teamId = localStorage.getItem('p2p_team_id');
  const subteamId = localStorage.getItem('p2p_subteam_id');
  if (!teamId || !subteamId) return null;
  return {
    teamId,
    teamName: localStorage.getItem('p2p_team_name') || '',
    subteamId,
    subteamName: localStorage.getItem('p2p_subteam_name') || '',
    fastApiRunId: localStorage.getItem('p2p_fast_api_run_id') || null,
    djangoEventLogId: localStorage.getItem('p2p_django_event_log_id') || null,
    teamRole: (localStorage.getItem('p2p_team_role') as 'admin' | 'member') || 'member',
  };
}

export function updateSubteamContextIds(fastApiRunId: string, djangoEventLogId: string) {
  localStorage.setItem('p2p_fast_api_run_id', fastApiRunId);
  localStorage.setItem('p2p_django_event_log_id', djangoEventLogId);
}
