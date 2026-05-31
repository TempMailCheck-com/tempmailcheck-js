const BASE_URL = 'https://api.tempmailcheck.com/v1';

export interface CheckResponse {
  status: number;
  email: string;
  domain: string;
  valid_syntax: boolean;
  disposable: boolean;
  free_provider: boolean;
  has_mx: boolean;
  score: number;
  credits_remaining: number;
  ms: number;
}

export interface DomainResponse {
  status: number;
  domain: string;
  disposable: boolean;
  has_mx: boolean;
  score: number;
  credits_remaining: number;
  ms: number;
}

export interface BulkSubmitResponse {
  status: number;
  job_id: string;
  poll_url: string;
}

export interface BulkResultItem {
  email: string;
  disposable: boolean;
  score: number;
}

export interface BulkStatusResponse {
  status: number;
  job_id: string;
  state: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  results?: BulkResultItem[];
}

export interface AccountResponse {
  status: number;
  email: string;
  plan: string;
  credits_remaining: number;
  credits_limit: number;
  resets_at: string;
}

export interface TempMailCheckOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface BulkOptions {
  poll?: boolean;
  pollInterval?: number;
}

export class TempMailCheckError extends Error {
  status: number;
  retryAfter: number | null;

  constructor(message: string, status: number, retryAfter: number | null = null) {
    super(message);
    this.name = 'TempMailCheckError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export class TempMailCheck {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(apiKey: string, options?: Omit<TempMailCheckOptions, 'apiKey'>) {
    if (!apiKey) throw new Error('API key is required');
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl ?? BASE_URL;
    this.timeout = options?.timeout ?? 30_000;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'X-API-Key': this.apiKey,
          ...(init?.headers as Record<string, string> | undefined),
        },
      });

      if (!res.ok) {
        const retryAfter = res.status === 429
          ? parseInt(res.headers.get('retry-after') ?? '', 10) || null
          : null;
        let message: string;
        try {
          const body = await res.json() as { message?: string };
          message = body.message ?? res.statusText;
        } catch {
          message = res.statusText;
        }
        throw new TempMailCheckError(message, res.status, retryAfter);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof TempMailCheckError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new TempMailCheckError('Request timed out', 408);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async check(email: string): Promise<CheckResponse> {
    return this.request<CheckResponse>(`/check?email=${encodeURIComponent(email)}`);
  }

  async domain(domain: string): Promise<DomainResponse> {
    return this.request<DomainResponse>(`/domain?domain=${encodeURIComponent(domain)}`);
  }

  async bulk(emails: string[], options?: BulkOptions): Promise<BulkSubmitResponse | BulkStatusResponse> {
    const submit = await this.request<BulkSubmitResponse>('/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails }),
    });

    if (!options?.poll) return submit;

    const interval = options.pollInterval ?? 1_000;
    let result: BulkStatusResponse;
    do {
      await new Promise((r) => setTimeout(r, interval));
      result = await this.bulkStatus(submit.job_id);
    } while (result.state === 'pending' || result.state === 'processing');

    return result;
  }

  async bulkStatus(jobId: string): Promise<BulkStatusResponse> {
    return this.request<BulkStatusResponse>(`/bulk/${encodeURIComponent(jobId)}`);
  }

  async account(): Promise<AccountResponse> {
    return this.request<AccountResponse>('/account');
  }
}

export default TempMailCheck;
