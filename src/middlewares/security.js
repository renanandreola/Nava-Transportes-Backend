const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const createRateLimiter = ({
  windowMs,
  limit,
  message = "Muitas requisições. Tente novamente mais tarde.",
}) => {
  const requests = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();

    for (const [key, value] of requests.entries()) {
      if (value.resetAt <= now) requests.delete(key);
    }
  }, windowMs);

  cleanup.unref();

  return (req, res, next) => {
    if (req.method === "OPTIONS") return next();

    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    let current = requests.get(key);

    if (!current || current.resetAt <= now) {
      if (!current && requests.size >= 10000) {
        const oldestKey = requests.keys().next().value;
        requests.delete(oldestKey);
      }

      current = { count: 0, resetAt: now + windowMs };
    }

    current.count += 1;
    requests.set(key, current);

    const remaining = Math.max(0, limit - current.count);
    const resetSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (current.count > limit) {
      res.setHeader("Retry-After", String(resetSeconds));
      res.setHeader("Cache-Control", "no-store");
      return res.status(429).json({ message });
    }

    next();
  };
};

const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: positiveInteger(process.env.API_RATE_LIMIT, 300),
});

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: positiveInteger(process.env.LOGIN_RATE_LIMIT, 10),
  message: "Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.",
});

const refreshRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: positiveInteger(process.env.REFRESH_RATE_LIMIT, 60),
  message: "Muitas tentativas de renovação. Aguarde e tente novamente.",
});

const securityHeaders = (req, res, next) => {
  const isApiDocs = req.path.startsWith("/nava/api-docs");

  if (!isApiDocs) {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    );
  }

  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), payment=(), usb=()"
  );

  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
};

const containsSuspiciousKey = (value, depth = 0) => {
  if (depth > 20) return true;
  if (!value || typeof value !== "object") return false;

  for (const [key, child] of Object.entries(value)) {
    if (
      key === "__proto__" ||
      key === "prototype" ||
      key === "constructor" ||
      key.startsWith("$") ||
      key.includes(".")
    ) {
      return true;
    }

    if (containsSuspiciousKey(child, depth + 1)) return true;
  }

  return false;
};

const rejectSuspiciousInput = (req, res, next) => {
  const hasNestedQueryValue = Object.values(req.query || {}).some(
    (value) => value !== null && typeof value === "object"
  );

  if (
    hasNestedQueryValue ||
    containsSuspiciousKey(req.query) ||
    containsSuspiciousKey(req.body)
  ) {
    return res.status(400).json({ message: "Requisição inválida." });
  }

  next();
};

module.exports = {
  apiRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  rejectSuspiciousInput,
  securityHeaders,
};
