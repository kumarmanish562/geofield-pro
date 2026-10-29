import { env } from "../../config/env.js";

export function refreshCookieOptions() {
  const options = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/api/v1/auth",
  };

  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }

  return options;
}

export function setRefreshCookie(res, token, expiresAt) {
  res.cookie(env.AUTH_COOKIE_NAME, token, {
    ...refreshCookieOptions(),
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(env.AUTH_COOKIE_NAME, refreshCookieOptions());
}