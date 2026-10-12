import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000/api/v1'
    : 'http://localhost:4000/api/v1';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: Record<string, string[]>;
}

export class MobileApiError extends Error {
  public problem?: ProblemDetails;
  public status: number;

  constructor(status: number, message: string, problem?: ProblemDetails) {
    super(message);
    this.name = 'MobileApiError';
    this.status = status;
    this.problem = problem;
  }
}

export async function mobileApiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await SecureStore.getItemAsync('accessToken');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let problem: ProblemDetails | undefined;
    try {
      const data = await response.json();
      if (data && typeof data === 'object') {
        problem = data as ProblemDetails;
      }
    } catch {
      // not json
    }

    const message = problem?.detail || problem?.title || `Richiesta fallita: ${response.status}`;
    throw new MobileApiError(response.status, message, problem);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return null as unknown as T;
}
