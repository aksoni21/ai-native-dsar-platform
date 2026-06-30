# Security Policy

## Reporting a Vulnerability

Please do not open a public GitHub issue for security vulnerabilities.

Report suspected vulnerabilities by emailing the maintainers at security@example.com with:

- a short description of the issue,
- affected routes, files, or configuration,
- reproduction steps,
- potential impact,
- whether any secrets, credentials, tokens, or personal data may have been exposed.

We will acknowledge reports as quickly as practical and coordinate a fix before public disclosure.

## Secrets and Credentials

This repository must not contain live credentials. Before opening a pull request, check for:

- API keys and model-provider tokens,
- database URLs,
- SMTP, IMAP, or OAuth credentials,
- refresh tokens,
- private email addresses,
- customer or prospect data,
- screenshots or generated artifacts containing sensitive data.

Use `.env.local.example` for placeholders only. Real values belong in `.env.local`, deployment secrets, or a secrets manager. `.env.local` is ignored and must never be committed.

## Supported Versions

This project is currently a public reference implementation. Security fixes are applied to the main public branch.

## Demo Safety Model

The demo is designed around read-only agent tools with explicit human approval gates for side effects. New write, delete, email, export, or notification behavior should preserve that boundary and require an auditable approval path.
