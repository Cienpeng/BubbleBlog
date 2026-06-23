const BASE = '';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  newToken?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json.data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

// Admin API — includes auth header and returns newToken
async function adminRequest<T>(url: string, options?: RequestInit): Promise<{ data: T; newToken?: string }> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${url}`, { headers, ...options });

  if (res.status === 401) {
    let errMsg = '当前登录会话已失效或已被强制下线，请重新登录';
    try {
      const json = await res.json();
      if (json.error) errMsg = json.error;
    } catch {}
    window.dispatchEvent(new CustomEvent('auth-unauthorized', { detail: errMsg }));
    throw new Error(errMsg);
  }

  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return { data: json.data as T, newToken: json.newToken };
}

export const adminApi = {
  get: <T>(url: string) => adminRequest<T>(url),
  post: <T>(url: string, body?: unknown) =>
    adminRequest<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    adminRequest<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => adminRequest<T>(url, { method: 'DELETE' }),
  upload: <T>(url: string, formData: FormData) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${url}`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async res => {
      if (res.status === 401) {
        let errMsg = '当前登录会话已失效，请重新登录';
        try {
          const json = await res.json();
          if (json.error) errMsg = json.error;
        } catch {}
        window.dispatchEvent(new CustomEvent('auth-unauthorized', { detail: errMsg }));
        throw new Error(errMsg);
      }
      return res.json();
    }).then(json => {
      if (!json.success) throw new Error(json.error || 'Upload failed');
      return { data: json.data as T, newToken: json.newToken };
    });
  }
};
