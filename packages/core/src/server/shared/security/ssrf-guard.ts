/**
 * SSRF protection helpers for outbound HTTP requests where any part of the
 * URL is user-controlled (e.g. the price watcher's product URL).
 *
 * The guard performs four layers of defense:
 *   1. Scheme allowlist (http/https only).
 *   2. Hostname lexical checks — reject `localhost`, `*.local`, `*.internal`,
 *      and IP literals that fall inside private / loopback / link-local /
 *      reserved ranges.
 *   3. DNS resolution check (`assertSafeOutboundUrlResolved`) — resolve the
 *      hostname and verify every returned A/AAAA record is in a public range.
 *      Blocks "hostname points at 127.0.0.1" bypasses.
 *   4. Manual redirect handling — every hop is re-validated, so a public URL
 *      cannot 302 into an internal target.
 *
 * `safeFetch` applies all four layers. Lexical-only callers can use
 * `assertSafeOutboundUrl` directly, but the DNS-aware variant is preferred.
 *
 * DNS rebinding (resolver returns a public IP at validation time but a
 * private IP at connect time) is still theoretically possible without IP
 * pinning at the socket layer. For deployments with that threat model, put
 * outbound fetches behind a reverse proxy that enforces IP policy.
 */

/**
 * Private, loopback, link-local, or otherwise reserved IP ranges we refuse to
 * contact from a user-supplied URL. Encoded as `(ip) => boolean` predicates.
 */
const PRIVATE_IPV4_PREDICATES: Array<(parts: number[]) => boolean> = [
  // 0.0.0.0/8 — this network
  (p) => p[0] === 0,
  // 10.0.0.0/8 — private
  (p) => p[0] === 10,
  // 100.64.0.0/10 — carrier-grade NAT
  (p) => p[0] === 100 && p[1] >= 64 && p[1] <= 127,
  // 127.0.0.0/8 — loopback
  (p) => p[0] === 127,
  // 169.254.0.0/16 — link-local (AWS IMDS 169.254.169.254 is here)
  (p) => p[0] === 169 && p[1] === 254,
  // 172.16.0.0/12 — private
  (p) => p[0] === 172 && p[1] >= 16 && p[1] <= 31,
  // 192.0.0.0/24 — IETF reserved
  (p) => p[0] === 192 && p[1] === 0 && p[2] === 0,
  // 192.0.2.0/24 — TEST-NET-1
  (p) => p[0] === 192 && p[1] === 0 && p[2] === 2,
  // 192.168.0.0/16 — private
  (p) => p[0] === 192 && p[1] === 168,
  // 198.18.0.0/15 — benchmark
  (p) => p[0] === 198 && (p[1] === 18 || p[1] === 19),
  // 198.51.100.0/24 — TEST-NET-2
  (p) => p[0] === 198 && p[1] === 51 && p[2] === 100,
  // 203.0.113.0/24 — TEST-NET-3
  (p) => p[0] === 203 && p[1] === 0 && p[2] === 113,
  // 224.0.0.0/4 — multicast
  (p) => p[0] >= 224 && p[0] <= 239,
  // 240.0.0.0/4 — reserved
  (p) => p[0] >= 240,
];

/**
 * Hostname suffixes that should never be reachable from a user-supplied URL.
 */
const BLOCKED_HOSTNAME_SUFFIXES = [
  ".local",
  ".localhost",
  ".internal",
  ".arpa",
  ".intranet",
  ".corp",
  ".home",
  ".private",
];

function parseIPv4(host: string): number[] | null {
  const match = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  const parts = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
  if (parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return parts;
}

function isBlockedIPv6(host: string): boolean {
  const trimmed = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (trimmed === "::" || trimmed === "::1") return true;
  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) — reuse the IPv4 check.
  const v4Mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) {
    const parts = parseIPv4(v4Mapped[1]!);
    if (parts && PRIVATE_IPV4_PREDICATES.some((pred) => pred(parts))) return true;
  }
  // Link-local fe80::/10 and unique-local fc00::/7
  if (/^fe[89ab][0-9a-f]?:/.test(trimmed)) return true;
  if (/^f[cd][0-9a-f]{2}:/.test(trimmed)) return true;
  return false;
}

/**
 * Validate a URL for outbound fetch. Returns the parsed URL on success;
 * throws a plain Error with a non-leaky message on failure.
 */
export function assertSafeOutboundUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname) {
    throw new Error("URL must include a hostname");
  }

  if (hostname === "localhost") {
    throw new Error("URL host is not allowed");
  }

  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      throw new Error("URL host is not allowed");
    }
  }

  // IP literal — check against private ranges.
  const ipv4Parts = parseIPv4(hostname);
  if (ipv4Parts) {
    if (PRIVATE_IPV4_PREDICATES.some((pred) => pred(ipv4Parts))) {
      throw new Error("URL host is not allowed");
    }
  } else if (hostname.includes(":") || (url.host.startsWith("[") && url.host.endsWith("]"))) {
    // Likely IPv6 literal.
    if (isBlockedIPv6(hostname)) {
      throw new Error("URL host is not allowed");
    }
  }

  return url;
}

/**
 * Resolve a hostname to one or more IPv4/IPv6 addresses and reject if any of
 * the returned addresses is in a private/loopback/link-local/reserved range.
 *
 * Called by `safeFetch`; callers can invoke directly if they need DNS-aware
 * validation outside of a fetch context. Silently tolerates IP-literal
 * hostnames (they were already validated lexically in `assertSafeOutboundUrl`).
 */
export async function assertSafeOutboundUrlResolved(input: string): Promise<URL> {
  const url = assertSafeOutboundUrl(input);
  const hostname = url.hostname.toLowerCase();

  // If the host is already an IP literal, lexical validation is sufficient.
  if (parseIPv4(hostname)) return url;
  if (hostname.includes(":")) return url;

  // Lazy import so the guard remains usable in edge/bundler environments
  // that don't need DNS.
  let lookup: typeof import("node:dns/promises").lookup;
  try {
    ({ lookup } = await import("node:dns/promises"));
  } catch {
    // dns module unavailable (e.g. workerd). Fall back to lexical only.
    return url;
  }

  let results: Array<{ address: string; family: number }>;
  try {
    results = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    // Let fetch() surface the DNS error itself — not our job to classify.
    return url;
  }

  for (const { address, family } of results) {
    if (family === 4) {
      const parts = parseIPv4(address);
      if (parts && PRIVATE_IPV4_PREDICATES.some((pred) => pred(parts))) {
        throw new Error("URL host resolves to a private address");
      }
    } else if (family === 6) {
      if (isBlockedIPv6(address)) {
        throw new Error("URL host resolves to a private address");
      }
    }
  }

  return url;
}

/**
 * Options for safeFetch. Mirrors a subset of fetch() options plus a hop limit
 * and optional headers that should be applied to every hop.
 */
export interface SafeFetchOptions {
  headers?: HeadersInit;
  method?: string;
  body?: BodyInit | null;
  /** Maximum number of redirect hops to follow. Default 5. */
  maxRedirects?: number;
  /** Abort signal propagated to each underlying fetch call. */
  signal?: AbortSignal;
}

/**
 * SSRF-safe replacement for `fetch(url, { redirect: "follow" })`.
 *
 * Each redirect hop is re-validated against the SSRF allowlist. A public URL
 * that 302s to an internal target is rejected rather than silently followed.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 5;
  let currentUrl = await assertSafeOutboundUrlResolved(rawUrl);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(currentUrl.toString(), {
      method: options.method,
      headers: options.headers,
      body: options.body,
      redirect: "manual",
      signal: options.signal,
    });

    const status = response.status;
    if (status < 300 || status >= 400 || status === 304) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      return response;
    }

    if (hop === maxRedirects) {
      throw new Error("Too many redirects");
    }

    // Resolve the Location header against the current URL so relative
    // redirects work. Re-validate lexically AND via DNS before the next hop.
    const next = new URL(location, currentUrl);
    currentUrl = await assertSafeOutboundUrlResolved(next.toString());
  }

  throw new Error("Too many redirects");
}
