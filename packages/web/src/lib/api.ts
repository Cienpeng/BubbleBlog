const BASE = '';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  newToken?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'same-origin',
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
};

// Admin API — includes auth header and returns newToken
async function adminRequest<T>(url: string, options?: RequestInit): Promise<{ data: T; newToken?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const res = await fetch(`${BASE}${url}`, { headers, credentials: 'same-origin', ...options });

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
  upload: <T>(url: string, formData: FormData) => {
    return fetch(`${url}`, {
      method: 'POST',
      credentials: 'same-origin',
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
