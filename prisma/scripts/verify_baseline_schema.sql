-- Read-only: list tables and enums in public schema for baseline verification
SELECT 'TABLE' AS kind, tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT 'ENUM' AS kind, t.typname AS name FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' GROUP BY t.typname ORDER BY t.typname;
