# Contributing

Thanks for helping improve this project.

## Before You Open a Pull Request

Run a local secret and privacy check:

```bash
rg -n --hidden -i -g '!node_modules/**' -g '!.next/**' -g '!.git/**' \
  'sk-ant|api[_-]?key|client_secret|refresh_token|postgresql://|smtp_pass|imap_pass|gmail_refresh_token|cron_secret|@gmail\.com|@yahoo\.com|@outlook\.com'
```

Do not commit `.env.local`, generated reports, local exports, inbox dumps, screenshots with real data, or production database output.

## Demo Data Rules

- Use fictional names and synthetic records.
- Use reserved domains such as `example.com` or `.example`.
- Keep phone numbers in reserved `555-01xx` style ranges where possible.
- Do not use real customer, employee, prospect, vendor, or mailbox data.

## Code Boundaries

Most agent tools should remain read-only. Any new side effect, including email, export, deletion, mutation, or notification, must have an explicit human approval gate and an auditable execution path.

## Pull Request Checklist

- The change is scoped to one behavior or documentation improvement.
- Public placeholders are used for all sample credentials and contacts.
- New environment variables are documented in `.env.local.example`.
- The README or relevant docs are updated when behavior changes.
- Tests or manual verification notes are included when appropriate.
