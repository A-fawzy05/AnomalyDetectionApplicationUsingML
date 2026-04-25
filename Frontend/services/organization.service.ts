const API_BASE_URL = 'http://localhost:3001/api/org';

export interface OrgMembership {
  id: string;
  name: string;
  role: 'admin' | 'member';
  canViewDashboard: boolean;
  memberCount: number;
  isCreator: boolean;
  createdAt: string;
}

export interface CreateOrgData {
  name: string;
  joinPassword: string;
  confirmPassword: string;
}

export interface JoinOrgData {
  name: string;
  joinPassword: string;
}

export interface OrgResponse {
  success: boolean;
  message: string;
  data?: OrgMembership;
}

export interface MyOrgsResponse {
  success: boolean;
  data: OrgMembership[];
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

class OrganizationService {
  async create(data: CreateOrgData): Promise<OrgResponse> {
    const response = await fetch(`${API_BASE_URL}/create`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create organization');
    }
    return result;
  }

  async join(data: JoinOrgData): Promise<OrgResponse> {
    const response = await fetch(`${API_BASE_URL}/join`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to join organization');
    }
    return result;
  }

  async getMyOrgs(): Promise<MyOrgsResponse> {
    const response = await fetch(`${API_BASE_URL}/my-orgs`, {
      headers: getAuthHeader(),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch organizations');
    }
    return result;
  }

  async deleteOrg(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete organization');
    }
    return result;
  }
}

const organizationService = new OrganizationService();
export default organizationService;
