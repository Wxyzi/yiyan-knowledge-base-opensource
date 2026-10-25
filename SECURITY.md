# Security

## Report privately

Do not put credentials, user records, or exploitable account details in a public issue. Use GitHub's **Security > Report a vulnerability** when private reporting is enabled. If it is unavailable, first ask the maintainer for a private reporting channel without including exploit details or sensitive data.

## Release boundary

This code starter starts with a new Git history. It includes two newly authored examples, not an export of the complete knowledge library. Database schemas are included; database rows, environment files, deployment settings, historical Git objects, logs, local backups and private research materials are not.

The release check rejects common credential patterns and unexpected content files. It is deliberately conservative and is not a substitute for a dedicated secret scanner, dependency audit or penetration test. Never add a real credential to satisfy a demo.

## Deployment checklist

- Use an independent Supabase project. Review and apply its SQL before opening registration.
- Keep RLS enabled. Verify with separate non-admin accounts that private records cannot be read, updated or deleted across users. The included tests inspect SQL structure; they do not run a live multi-user database test.
- Protect admin promotion. Browser users may update the allowed profile fields but not their role.
- Keep all provider/secret keys server-side. The anon/publishable key is not a substitute for database access control.
- Leave `DEMO_MODE=false` for real deployments. The optional demo exception is restricted to known GET/HEAD reading paths and requires both Supabase settings to be absent. It does not authorize API writes or admin pages.
- Configure Auth callback URLs, production email delivery, account recovery, password policy and any required bot protection in your own project.
- AI rate limiting is currently process-local. Add shared rate limiting and provider spending limits before operating a public multi-instance service. Review prompt injection risks and treat model responses as untrusted, not authoritative evidence.
- Keep learning analytics disabled until the privacy notice, consent requirements, retention and deletion procedures are ready. Admin access to AI histories must be disclosed. IP hashes remain potentially identifying.
- CSP currently allows inline scripts for framework compatibility. A nonce-based policy is a possible future hardening step, not a property claimed by this starter.
- Keep production secrets out of forks and untrusted pull request builds. Turn on dependency alerts and private vulnerability reporting in repository settings.
- Back up your database separately. Deleting a secret from the latest commit does not remove it from history; rotate exposed credentials before publishing.

## Verification limits

Local tests and a build do not verify a newly created cloud database, external email delivery, provider account entitlements, distributed rate limiting, or every authenticated workflow. No guarantee of being vulnerability-free is made.
