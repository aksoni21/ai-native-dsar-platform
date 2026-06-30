import os
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import create_engine, pool

from alembic import context

# Load DATABASE_URL_FOR_ALEMBIC from the Next.js .env.local in the project root.
# We use a distinct var name (not DATABASE_URL) so that Next.js server code
# can't accidentally pick up the privileged Postgres connection string.
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None

# All migrations in this Alembic project target the naica_demo schema.
# The version table also lives there to avoid colliding with other Alembic
# projects that share the same Postgres instance (e.g. law_intel.alembic_version).
SCHEMA = "naica_demo"


def _get_url() -> str:
    url = os.environ.get("DATABASE_URL_FOR_ALEMBIC", "")
    if not url:
        raise RuntimeError(
            "Missing DATABASE_URL_FOR_ALEMBIC. Add it to ../.env.local with the "
            "Supabase Postgres connection string (Dashboard → Project Settings → Database)."
        )
    return url


def run_migrations_offline() -> None:
    context.configure(
        url=_get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=SCHEMA,
        include_schemas=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(_get_url(), poolclass=pool.NullPool)

    with connectable.connect() as connection:
        # Ensure the schema exists before Alembic tries to write its version
        # table into it. Idempotent — safe on repeat runs.
        connection.exec_driver_sql(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")
        connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=SCHEMA,
            include_schemas=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
