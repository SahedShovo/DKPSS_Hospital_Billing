const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  statusCode?: number;
  message?: unknown;
}

function getErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const messages = value.map(getErrorMessage).filter((message): message is string => Boolean(message));
    return messages.length ? messages.join(', ') : undefined;
  }
  if (value && typeof value === 'object' && 'message' in value) {
    return getErrorMessage((value as { message: unknown }).message);
  }
  return undefined;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Login failures are expected credential errors, not an expired session.
  // Preserve the API's specific message so the login page can explain the failure.
  if (res.status === 401 && path !== '/auth/login') {
    handleUnauthorized();
    throw new ApiError(401, 'সেশন শেষ হয়ে গেছে, আবার লগইন করুন');
  }

  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, 'সার্ভার থেকে সঠিক উত্তর পাওয়া যায়নি');
  }

  if (!res.ok || !json.success) {
    const message = getErrorMessage(json.message) ?? 'কিছু একটা ভুল হয়েছে';
    throw new ApiError(res.status, message);
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};
