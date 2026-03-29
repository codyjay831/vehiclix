# Production Prisma migrations: dedicated image and Cloud Run Job

This repo’s **app** image (`Dockerfile`) builds Next.js and runs `node server.js`. **Do not** reuse that image only to run `prisma migrate deploy` in production: it is larger, starts unrelated processes if misconfigured, and couples schema changes to the web runtime.

Use **`Dockerfile.migrate`** to build a **migration-only** image that contains Prisma, `prisma/`, and `prisma.config.ts`, and runs **`npx prisma migrate deploy`** as its command (equivalent to **`npm run migrate:deploy`** locally).

Related: [DEPLOY_VEHICLIX_GOOGLE.md](../../DEPLOY_VEHICLIX_GOOGLE.md) (Firebase App Hosting env vars). For **production**, prefer this job-based flow; the deploy guide’s **Cloud SQL Auth Proxy** steps are an **optional** fallback when you must run migrations from a laptop.

---

## Deprecated: Cloud Run Jobs built from the full app image

If you previously created a Cloud Run Job from the **Next.js / app** image (for example **`vehiclix-prisma-migrate2`**) to run Prisma, treat that as **deprecated**: that image is not intended as a migration runner, startup can fail or behave unlike a one-shot CLI, and it widens the secret and attack surface for a task that only needs Prisma + SQL.

- **Do not** point new automation at that job.
- **Replace** it with a job whose image is built from **`Dockerfile.migrate`** (this document).
- **When to delete the old job:** after the new migration job has **executed successfully at least once** against production (so you are not left without a working path). Then remove the deprecated job in Cloud Run → Jobs to avoid accidental use.

---

---

## Why this is safer than the app image

| Concern | App image (`Dockerfile`) | Migration image (`Dockerfile.migrate`) |
|--------|---------------------------|----------------------------------------|
| Attack / blast radius | Full Next.js stack, secrets surface for the web app | Only Prisma + migration SQL; no HTTP server |
| Accidental misuse | Wrong `CMD` could boot the storefront | Default `CMD` is only `migrate deploy` |
| Size & pull time | Large (standalone + static assets) | Smaller than the app image (no Next bundle), but still installs **all** `package.json` production dependencies via `npm ci --omit=dev` for lockfile parity — only Prisma is *used* at runtime |
| Failure semantics | Mixing migrate with app deploy confuses rollback | Job success/failure is explicit before app deploy |

---

## Build and push the migration image

Set your **Artifact Registry** location and repository (create the repo once in Console or via `gcloud artifacts repositories create`).

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export AR_REPO="vehiclix"
export TAG="$(git rev-parse --short HEAD)"

export MIGRATE_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/evo-motors-migrate:${TAG}"
```

### Option A — Cloud Build (no local Docker)

The default `gcloud builds submit` **Dockerfile is `Dockerfile` (the app)**. For migrations, use the repo’s **`cloudbuild.migrate.yaml`**, which runs `docker build -f Dockerfile.migrate`.

From the repository root:

```bash
gcloud builds submit --project="${PROJECT_ID}" \
  --config=cloudbuild.migrate.yaml \
  --substitutions=_REGION="${REGION}",_AR_REPO="${AR_REPO}",_TAG="${TAG}"
```

That pushes to:

```text
${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/evo-motors-migrate:${TAG}
```

Set `MIGRATE_IMAGE` to that URI (same as the `images:` entry in `cloudbuild.migrate.yaml`).

### Option B — Local Docker

```bash
docker build -f Dockerfile.migrate -t "${MIGRATE_IMAGE}" .
docker push "${MIGRATE_IMAGE}"
```

---

## Required runtime environment

Prisma reads the datasource URL from **`prisma.config.ts`**, which uses **`process.env.DATABASE_URL`** only (this repo’s `schema.prisma` datasource has no `url` / `directUrl` fields; there is **no** separate `DIRECT_URL` for the CLI).

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | **Yes** | Single-line PostgreSQL URL reachable from the job (private IP + VPC, or Cloud SQL Unix socket via `/cloudsql/...`). Same rules as [DEPLOY_VEHICLIX_GOOGLE.md](../../DEPLOY_VEHICLIX_GOOGLE.md) (URL encoding, `?schema=public`). |

**Not used by this image (omit from the job unless your platform injects them anyway):** `USE_CLOUD_SQL_CONNECTOR`, `CLOUD_SQL_INSTANCE_CONNECTION_NAME`, `DB_PASSWORD`, `DB_USER`, `DB_NAME`, `DIRECT_URL`, and other app secrets. Those exist for the **Next.js** runtime in `src/lib/db.ts`; the migration runner uses the standard Postgres driver with **`DATABASE_URL`** only.

`prisma.config.ts` includes `import "dotenv/config"` for local `.env` loading; on Cloud Run, secrets are injected as real env vars, so no `.env` file is required in the image.

---

## Network: VPC private IP vs Cloud SQL Unix socket

Pick **one** pattern (match how your Cloud SQL instance is set up).

### A) Private IP + VPC connector (common for Cloud SQL private IP)

1. Create a **Serverless VPC Access connector** in the same region as the job.
2. Cloud SQL must have **private IP** enabled and routing from that VPC.
3. **`DATABASE_URL`** host is the instance **private IP** (or private DNS if you use it), port `5432` (or your configured port).

Example job flags:

```text
--vpc-connector=CONNECTOR_NAME
--vpc-egress=private-ranges-only
```

Use Secret Manager for the URL (see below).

### B) Cloud SQL Auth Proxy socket (Cloud Run–managed)

1. Attach the instance to the job: **`--set-cloudsql-instances=PROJECT_ID:REGION:INSTANCE_NAME`**
2. Set **`DATABASE_URL`** to use the proxy socket, for example:

```text
postgresql://DB_USER:DB_PASSWORD@localhost/DB_NAME?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME&schema=public
```

Adjust user, password, and database name. Encode special characters in the password for the URL.

---

## Cloud Run Job: create (first time)

Replace placeholders. Use the **same region** as your connector and (if used) Cloud SQL instance.

```bash
export JOB_NAME="vehiclix-prisma-migrate"
export VPC_CONNECTOR="your-connector-name"   # omit if using only --set-cloudsql-instances with socket URL
export SECRET_RESOURCE="DATABASE_URL:latest" # Secret Manager secret name + version
```

**Execute command:** the image default is already `npx prisma migrate deploy`. You do **not** need to override `command` unless your platform requires an explicit entry.

Create with Secret Manager–backed `DATABASE_URL` **and private IP** (include VPC flags only when `DATABASE_URL` uses a private IP host; omit them when using the Cloud SQL socket variant below):

```bash
gcloud run jobs create "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${MIGRATE_IMAGE}" \
  --tasks=1 \
  --parallelism=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --set-secrets="DATABASE_URL=${SECRET_RESOURCE}" \
  --vpc-connector="${VPC_CONNECTOR}" \
  --vpc-egress=private-ranges-only
```

If using **Cloud SQL attachment** (socket URL in secret):

```bash
gcloud run jobs create "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${MIGRATE_IMAGE}" \
  --tasks=1 \
  --parallelism=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --set-secrets="DATABASE_URL=${SECRET_RESOURCE}" \
  --set-cloudsql-instances="${PROJECT_ID}:${REGION}:YOUR_INSTANCE_NAME"
```

Grant the **job’s runtime service account** (default or custom):

- **Secret Manager Secret Accessor** on the `DATABASE_URL` secret.
- **Cloud SQL Client** on the instance (if using `--set-cloudsql-instances`).
- Appropriate VPC / subnet use for the connector.

---

## Cloud Run Job: update image after each release

```bash
gcloud run jobs update "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${MIGRATE_IMAGE}"
```

---

## Execute the migration job

```bash
gcloud run jobs execute "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --wait
```

- Exit code **0** and logs showing applied migrations (or “already applied”) → safe to proceed with **Firebase App Hosting** / app deploy.
- Non-zero exit → **do not** deploy the new app revision until migrations are fixed and the job succeeds.

Logs:

```bash
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --limit=50 \
  --freshness=1h
```

---

## Rollback and failure handling

1. **`prisma migrate deploy` is forward-only.** There is no built-in “down” in production. Rolling back schema usually means **restore from backup** or ship a **new migration** that reverses a change.
2. **Failed mid-migration:** Inspect Cloud Run Job logs and Prisma’s error (connectivity vs SQL error). Fix the migration or DB state, rebuild the **migration image** if you changed `prisma/migrations`, update the job, and **execute again**. Prisma records applied migrations in `_prisma_migrations`; re-running after a fix is supported when the history is consistent.
3. **Do not deploy the app** on a failed job if the new code **requires** the new columns (otherwise you risk `P2022` and broken admin/API paths). If the migration is optional, coordinate with release policy.
4. **`--max-retries=0`** avoids automatic retries hiding the first error; you can raise it once you trust idempotency for transient network blips. Re-running `migrate deploy` manually is safe when migrations are already applied.

---

## Recommended CI/CD sequence (every production deploy)

Run these **in order**; do not deploy application code that **depends** on new schema until step 3 is green.

1. **Build and push** the migration image (`Dockerfile.migrate`) tagged with the git SHA (or release tag).
2. **Update** the Cloud Run Job to that image (`gcloud run jobs update … --image=…`).
3. **Execute** the job (`gcloud run jobs execute … --wait`) and **fail the pipeline** if the command fails.
4. **Only if step 3 succeeds**, deploy the **Firebase App Hosting** / Cloud Run **app** revision (the image from `Dockerfile` or your App Hosting build).

Firebase App Hosting does not run step 1–3 for you; it deploys the Next.js app only.

---

## Local parity

```bash
npm run migrate:deploy
# equivalent: npm run db:migrate:deploy
```

---

## Proof checklist (copy for runbooks)

- [ ] Artifact Registry repository exists (`_AR_REPO`, e.g. `vehiclix`).
- [ ] `DATABASE_URL` secret in Secret Manager (correct DB, URL-encoded password, `?schema=public` if you use that pattern).
- [ ] Job uses image **`…/evo-motors-migrate:<tag>`** from **`Dockerfile.migrate`**, not the app image.
- [ ] Job service account: **Secret Accessor** on that secret; **Cloud SQL Client** if using `--set-cloudsql-instances`; VPC connector only if using private IP in `DATABASE_URL`.
- [ ] `gcloud run jobs execute … --wait` exits **0** before app deploy.
- [ ] Deprecated app-image job (e.g. **`vehiclix-prisma-migrate2`**) deleted **after** the new job succeeds once.
- [ ] App image build still uses **`Dockerfile`** only; migration image uses **`Dockerfile.migrate`** only.

## Operator checklist (Google Cloud Console / gcloud)

1. **Build & push** migration image — Cloud Build: `gcloud builds submit --config=cloudbuild.migrate.yaml --substitutions=_REGION=…,_AR_REPO=…,_TAG="$(git rev-parse --short HEAD)"` (or local `docker build` + `docker push`).
2. **Cloud Run → Jobs** — select the canonical job (e.g. `vehiclix-prisma-migrate`) → **Edit & deploy new revision** → set **Container image URL** to the new `evo-motors-migrate:<tag>` digest or tag → deploy.
3. **Execute** the job → **Logs** tab (or `gcloud run jobs execute … --wait`) → confirm success.
4. **Firebase App Hosting** (or your app pipeline) — deploy **only after** step 3 succeeds.
5. **Cleanup** — delete any old job that used the **app** image once the new path is verified.
