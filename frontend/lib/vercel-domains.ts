/**
 * Vercel Project Domains API helpers (server-only).
 * Docs: https://vercel.com/docs/rest-api/endpoints#domains
 */

export interface VercelDomainConfig {
  token: string;
  projectId: string;
  teamId?: string;
}

export interface VercelDomainResult {
  name: string;
  verified: boolean;
  verification?: Array<{ type?: string; domain?: string; value?: string }>;
  error?: string;
  configured?: boolean;
}

export function getVercelDomainConfig(): VercelDomainConfig | null {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId =
    process.env.VERCEL_PROJECT_ID?.trim() ||
    process.env.VERCEL_PROJECT_ID_FRONTEND?.trim();
  if (!token || !projectId) return null;
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || undefined;
  return { token, projectId, teamId };
}

export function isVercelDomainsConfigured(): boolean {
  return getVercelDomainConfig() !== null;
}

function teamQuery(config: VercelDomainConfig): string {
  return config.teamId
    ? `?teamId=${encodeURIComponent(config.teamId)}`
    : "";
}

async function vercelFetch(
  config: VercelDomainConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`https://api.vercel.com${path}${teamQuery(config)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export async function addProjectDomain(
  domain: string,
  config: VercelDomainConfig = getVercelDomainConfig()!,
): Promise<VercelDomainResult> {
  const res = await vercelFetch(
    config,
    `/v10/projects/${encodeURIComponent(config.projectId)}/domains`,
    {
      method: "POST",
      body: JSON.stringify({ name: domain }),
    },
  );

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  // Already exists is OK
  if (!res.ok && res.status !== 409) {
    return {
      name: domain,
      verified: false,
      error:
        (body.error as { message?: string } | undefined)?.message ||
        (typeof body.message === "string" ? body.message : null) ||
        `Vercel domain eklenemedi (${res.status})`,
    };
  }

  return {
    name: domain,
    verified: Boolean(body.verified),
    verification: body.verification as VercelDomainResult["verification"],
    configured: true,
  };
}

export async function getProjectDomain(
  domain: string,
  config: VercelDomainConfig = getVercelDomainConfig()!,
): Promise<VercelDomainResult> {
  const res = await vercelFetch(
    config,
    `/v9/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(domain)}`,
  );

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    return {
      name: domain,
      verified: false,
      error:
        (body.error as { message?: string } | undefined)?.message ||
        `Domain bilgisi alınamadı (${res.status})`,
    };
  }

  return {
    name: domain,
    verified: Boolean(body.verified),
    verification: body.verification as VercelDomainResult["verification"],
    configured: true,
  };
}

export async function verifyProjectDomain(
  domain: string,
  config: VercelDomainConfig = getVercelDomainConfig()!,
): Promise<VercelDomainResult> {
  // Ensure domain is registered on the project first
  const added = await addProjectDomain(domain, config);
  if (added.error && !added.configured) {
    // try get in case 409 path differed
    const existing = await getProjectDomain(domain, config);
    if (existing.error) {
      return added.error ? added : existing;
    }
  }

  const res = await vercelFetch(
    config,
    `/v9/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(domain)}/verify`,
    { method: "POST" },
  );

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    // Still return get status if verify endpoint fails after DNS not ready
    const current = await getProjectDomain(domain, config);
    if (current.verified) return current;
    return {
      name: domain,
      verified: false,
      error:
        (body.error as { message?: string } | undefined)?.message ||
        current.error ||
        `Domain doğrulanamadı (${res.status}). DNS kaydını kontrol edin.`,
      configured: true,
    };
  }

  return {
    name: domain,
    verified: Boolean(body.verified),
    verification: body.verification as VercelDomainResult["verification"],
    configured: true,
  };
}

/**
 * Map Vercel domain check into custom_domain_status fields.
 */
export function mapVercelResultToDomainStatus(result: VercelDomainResult): {
  custom_domain_status: "active" | "pending_dns" | "error";
  custom_domain_error: string | null;
} {
  if (result.verified) {
    return { custom_domain_status: "active", custom_domain_error: null };
  }
  if (result.error && !result.configured) {
    return {
      custom_domain_status: "error",
      custom_domain_error: result.error,
    };
  }
  return {
    custom_domain_status: "pending_dns",
    custom_domain_error: result.error || null,
  };
}
