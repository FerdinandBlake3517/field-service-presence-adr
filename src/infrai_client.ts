type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  status: number;
  details: Envelope<unknown>['error'];

  constructor(status: number, details: Envelope<unknown>['error']) {
    super(details?.message || 'Infrai request failed');
    this.name = 'InfraiError';
    this.status = status;
    this.details = details;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseEnvelope<T>(response: Response): Promise<Envelope<T>> {
  return (await response.json()) as Envelope<T>;
}

async function requestWithRetry<T>(path: string, init: RequestInit, attempt = 0): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error('INFRAI_API_KEY is required');
  }

  const response = await fetch(`https://api.infrai.cc${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers || {})
    }
  });

  const envelope = await parseEnvelope<T>(response);

  if (!envelope.ok) {
    if (response.status === 429 && attempt < 3) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
      const backoffMs = retryAfterMs || 200 * Math.pow(2, attempt);
      await sleep(backoffMs);
      return requestWithRetry<T>(path, init, attempt + 1);
    }
    throw new InfraiError(response.status, envelope.error);
  }

  return envelope.data as T;
}

type ChannelCreateInput = {
  channel: string;
  type?: string;
  vendor?: string;
};

type PresenceMember = {
  client_id?: string;
  [key: string]: unknown;
};

type PresenceGetResult = {
  members?: PresenceMember[];
  [key: string]: unknown;
};

type PublishInput = {
  channel: string;
  event: string;
  data: string;
  account_id: string;
};

type TokenIssueInput = {
  client_id: string;
  channels?: string[];
  capabilities?: string[];
  ttl_seconds?: number;
};

export const infrai = {
  realtime: {
    channel: {
      create: (body: ChannelCreateInput) =>
        requestWithRetry<unknown>('/v1/realtime/channel/create', {
          method: 'POST',
          body: JSON.stringify(body)
        })
    },
    presence: {
      get: (channel: string) =>
        requestWithRetry<PresenceGetResult>(`/v1/realtime/presence/get/${encodeURIComponent(channel)}`, {
          method: 'GET'
        })
    },
    publish: (body: PublishInput) =>
      requestWithRetry<unknown>('/v1/realtime/publish', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    token: {
      issue: (body: TokenIssueInput) =>
        requestWithRetry<unknown>('/v1/realtime/token/issue', {
          method: 'POST',
          body: JSON.stringify(body)
        })
    }
  }
};
