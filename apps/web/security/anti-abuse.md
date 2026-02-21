# Anti-Abuse & Malware Defense (System)

Muon Noi uses layered defenses:

1) Cloudflare WAF + Bot Management (free/optional)
2) Rate limiting on API routes
3) Turnstile challenge on high-risk actions (login, signup, post)
4) Input validation (length, charset, URL allowlist/denylist)
5) Abuse logs (hashed IP, timestamps) + automatic blocking
6) Content safety checks (links, repeated patterns, mass posting)
7) Strict security headers + CSP on Pages
