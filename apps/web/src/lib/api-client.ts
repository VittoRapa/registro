import { ProblemDetails } from '@registro/shared';

export function getApiBaseUrl(): string {
  let url = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 'http://localhost:4000/api/v1';
  url = url.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    if (url.endsWith('/api')) {
      url = `${url}/v1`;
    } else {
      url = `${url}/api/v1`;
    }
  }
  return url;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: ProblemDetails,
  ) {
    super(problem.detail || 'Si è verificato un errore');
    this.name = 'ApiError';
  }
}

export interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options;

  let url = `${getApiBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const authHeaders: Record<string, string> = {};
  if (token && !(headers as Record<string, string> | undefined)?.['Authorization']) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorProblem: ProblemDetails;
    try {
      errorProblem = await response.json();
    } catch {
      errorProblem = {
        type: 'about:blank',
        title: response.statusText,
        status: response.status,
        detail: 'Errore di comunicazione con il server.',
        timestamp: new Date().toISOString(),
      };
    }
    throw new ApiError(response.status, errorProblem);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

apiClient.get = <T>(endpoint: string, options?: FetchOptions): Promise<T> =>
  apiClient<T>(endpoint, { ...options, method: 'GET' });

apiClient.post = <T>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

apiClient.patch = <T>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

apiClient.delete = <T>(endpoint: string, options?: FetchOptions): Promise<T> =>
  apiClient<T>(endpoint, { ...options, method: 'DELETE' });

apiClient.put = <T>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
