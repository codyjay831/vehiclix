# Vehiclix production Prisma migrate — one-time / per-release checklist

**Canon:** dedicated image (`Dockerfile.migrate`) only · job `vehiclix-prisma-migrate` · deprecated `vehiclix-prisma-migrate2` (delete after first success) · runtime env on the job: **`DATABASE_URL` only** · order: build image → create/update job → execute → **then** deploy app.

| Item | Value |
|------|--------|
| GCP project | `vehiclix-f8be6` |
| Region (from repo defaults; **verify** in Console vs Cloud SQL / App Hosting) | `us-central1` |
| Canonical job | `vehiclix-prisma-migrate` |
| Deprecated job | `vehiclix-prisma-migrate2` |
| Migration image name | `evo-motors-migrate` |
| Artifact Registry repo (**default in repo; confirm exists**) | `vehiclix` |

---

## What you must look up before running anything

Complete this table once; paste values into the exports block below.

| Lookup | Where | Your value |
|--------|--------|------------|
| **Artifact Registry repository** | Console → Artifact Registry, or `gcloud artifacts repositories list --project=vehiclix-f8be6 --location=us-central1` | `AR_REPO` |
| **Secret holding production `DATABASE_URL`** | Secret Manager; often same logical name as the env var | `SECRET_ID` (e.g. `DATABASE_URL`) |
| **Networking model** | If Firebase/App Hosting `DATABASE_URL` uses a **`10.x` / private host** → **Path A**. If docs/secrets use **`localhost` + `/cloudsql/...`** → **Path B**. | A or B |
| **Path A only: Serverless VPC Access connector name** | Console → VPC network → Serverless VPC access, same region as job | `VPC_CONNECTOR` |
| **Path B only: Cloud SQL instance connection name** | Instance overview: `project:region:instance` | `INSTANCE_CONNECTION_NAME` |

**Region sanity check (Cloud Shell):**

```bash
gcloud config set project vehiclix-f8be6
gcloud sql instances list --project=vehiclix-f8be6 --format="table(name,region,settings.ipConfiguration.privateNetwork)"
gcloud run services list --project=vehiclix-f8be6 --region=us-central1 --format="table(metadata.name,status.url)" 2>/dev/null || true
```

If your Cloud SQL primary region is **not** `us-central1`, set `REGION` below to that region and use the same region for the Cloud Run Job and Artifact Registry location.

---

## Exports (fill placeholders, then run the rest)

```bash
export PROJECT_ID="vehiclix-f8be6"
export REGION="us-central1"   # change if Cloud SQL / run region differs
export AR_REPO="vehiclix"     # confirm via artifacts repositories list
export JOB_NAME="vehiclix-prisma-migrate"
export OLD_JOB_NAME="vehiclix-prisma-migrate2"
export TAG="$(git rev-parse --short HEAD)"   # run from repo root; or set TAG manually e.g. release tag

# Secret Manager: secret *id* (not full resource name)
export SECRET_ID="YOUR_SECRET_ID"   # e.g. DATABASE_URL

# Path A only:
export VPC_CONNECTOR="YOUR_VPC_CONNECTOR_NAME"

# Path B only (full connection name project:region:instance):
export INSTANCE_CONNECTION_NAME="vehiclix-f8be6:${REGION}:YOUR_INSTANCE_ID"

export MIGRATE_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/evo-motors-migrate:${TAG}"
```

---

## 0) Preflight (safe execute)

Run in order; do not skip.

- [ ] **Project:** `gcloud config get-value project` → `vehiclix-f8be6`
- [ ] **Repo root:** you have the commit you intend to ship (migrations on disk match what the image will build).
- [ ] **Artifact Registry:** repository `AR_REPO` exists in `REGION` (create if missing).
- [ ] **Secret:** `SECRET_ID` exists; value is production DB URL (URL-encoded password; `?schema=public` if you use that).
- [ ] **Path picked:** A (private IP + VPC) or B (Cloud SQL socket). Job flags must match the URL shape in the secret.
- [ ] **Decide create vs update:**  
  `gcloud run jobs describe "${JOB_NAME}" --project="${PROJECT_ID}" --region="${REGION}"`  
  - **NOT_FOUND** → use **create** block for your path (A or B).  
  - **Exists** → use **update** blocks only (image + verify VPC / `--set-cloudsql-instances` match your path).

**Recommendation:** Prefer **updating** `vehiclix-prisma-migrate` if it already exists and only the image tag changed. **Create** only if the canonical job name does not exist yet. Do not point CI at `vehiclix-prisma-migrate2`.

---

## 1) Build and push migration image

From the **repository root** (where `cloudbuild.migrate.yaml` lives):

```bash
gcloud builds submit --project="${PROJECT_ID}" \
  --config=cloudbuild.migrate.yaml \
  --substitutions=_REGION="${REGION}",_AR_REPO="${AR_REPO}",_TAG="${TAG}"
```

Confirm the image exists:

```bash
gcloud artifacts docker images list "${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}" \
  --project="${PROJECT_ID}" \
  --filter="package:evo-motors-migrate" \
  --limit=5
```

---

## 2) Create or update Cloud Run Job

### 2a) Update image (every release; job already exists)

```bash
gcloud run jobs update "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${MIGRATE_IMAGE}"
```

If you also need to fix networking or secrets, add the same flags as in create (Path A or B) to this `update` command.

---

### Path A — Private IP `DATABASE_URL` + VPC connector

**Create** (first time only):

```bash
gcloud run jobs create "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${MIGRATE_IMAGE}" \
  --tasks=1 \
  --parallelism=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --set-secrets="DATABASE_URL=${SECRET_ID}:latest" \
  --vpc-connector="${VPC_CONNECTOR}" \
  --vpc-egress=private-ranges-only
```

**IAM (job’s runtime service account — default or the one shown on the job):** Secret Manager **Secret Accessor** on `SECRET_ID`. No Cloud SQL attachment flag required if the URL targets private IP and routing is via VPC.

---

### Path B — Cloud SQL Unix socket (`localhost` + `/cloudsql/...` in `DATABASE_URL`)

**Create** (first time only):

```bash
gcloud run jobs create "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${MIGRATE_IMAGE}" \
  --tasks=1 \
  --parallelism=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --set-secrets="DATABASE_URL=${SECRET_ID}:latest" \
  --set-cloudsql-instances="${INSTANCE_CONNECTION_NAME}"
```

**IAM:** Secret Accessor on `SECRET_ID` + **Cloud SQL Client** on the instance.

---

## 3) Execute migration job

```bash
gcloud run jobs execute "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --wait
```

- Exit code **0** → proceed to app deploy.  
- Non-zero → **do not** deploy the app; read logs, fix DB/migrations/network, rebuild image if needed, `update` job, execute again.

**Logs:**

```bash
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --limit=50 \
  --freshness=1h \
  --format="table(timestamp,textPayload)"
```

---

## 4) App deploy gate

- [ ] Step 3 exited **0**
- [ ] Logs show migrations applied or already applied (no Prisma fatal error)
- [ ] **Now** deploy Firebase App Hosting / production app (never the reverse order for schema-dependent releases)

---

## 5) Delete deprecated job (after first successful canonical run)

Only after **`vehiclix-prisma-migrate`** has succeeded at least once against production:

```bash
gcloud run jobs delete "${OLD_JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --quiet
```

If the delete command returns NOT_FOUND, the old job is already gone.

---

## Command order summary

1. Preflight (section 0)  
2. `gcloud builds submit` (section 1)  
3. `gcloud run jobs create` **or** `gcloud run jobs update` (section 2, Path A **or** B)  
4. `gcloud run jobs execute … --wait` (section 3)  
5. Deploy app (section 4)  
6. `gcloud run jobs delete vehiclix-prisma-migrate2` (section 5)

---

## Notes

- `--set-secrets` uses `DATABASE_URL=${SECRET_ID}:latest`. If your secret version is pinned, replace `latest` with the version id.
- Repo `apphosting.yaml` uses **VPC egress to private ranges**, which usually aligns with **Path A** if production `DATABASE_URL` uses a private IP. Confirm against the actual secret value.
- Canonical doc: [PRODUCTION_PRISMA_CLOUD_RUN_JOB.md](./PRODUCTION_PRISMA_CLOUD_RUN_JOB.md).
