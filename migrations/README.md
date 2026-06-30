# Database migrations

Alembic project that owns the `naica_demo` schema in Supabase.

## Configuration

`env.py` loads the project's `../.env.local` and reads
`DATABASE_URL_FOR_ALEMBIC`. Use a name distinct from `DATABASE_URL` so the
privileged Postgres URL never collides with anything Next.js code expects.

Add to `naica_demo_real_api_calls/.env.local`:

```
DATABASE_URL_FOR_ALEMBIC=postgresql://postgres.<ref>:<password>@<host>.supabase.com:5432/postgres
```

Use the **Direct connection** or **Session pooler** string from
Supabase Dashboard → Project Settings → Database → Connection string.
Do NOT use the Transaction pooler — Alembic needs session-mode for DDL.

## One-time setup

```bash
cd migrations
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Apply migrations

```bash
source .venv/bin/activate     # if not already
alembic -c alembic.ini upgrade head
```

The Alembic version table lives in `naica_demo.alembic_version` so it won't
collide with other Alembic projects that share the same Postgres database.

## Create a new migration

```bash
alembic -c alembic.ini revision -m "short description"
```

A new file appears under `versions/`. Edit `upgrade()` and `downgrade()`,
then run `alembic upgrade head`.
