import dotenv from "dotenv";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const repoRoot = process.cwd();

/**
 * Loads the environment variables based on the target strategy.
 * 
 * Target Strategies:
 * - 'local': Loads .env and then .env.local (default)
 * - 'docker': Loads .env.docker
 * - 'production': Loads .env.production.local
 */
export function loadEnv(target: 'local' | 'docker' | 'production' = 'local') {
  if (target === 'production') {
    const prodFile = resolve(repoRoot, ".env.production.local");
    if (!existsSync(prodFile)) {
      console.warn(`❌  Production env file not found at ${prodFile}`);
      console.log("⚠️  Falling back to local env...");
      loadEnv('local');
      return;
    }
    console.log("⚠️  Loading PRODUCTION environment (.env.production.local)");
    dotenv.config({ path: prodFile, override: true });
  } else if (target === 'docker') {
    const dockerFile = resolve(repoRoot, ".env.docker");
    if (!existsSync(dockerFile)) {
      console.warn(`❌  Docker env file not found at ${dockerFile}`);
      console.log("⚠️  Falling back to local env...");
      loadEnv('local');
      return;
    }
    console.log("🐳 Loading DOCKER environment (.env.docker)");
    dotenv.config({ path: dockerFile, override: true });
  } else {
    // Local: .env then .env.local
    const baseFile = resolve(repoRoot, ".env");
    const localFile = resolve(repoRoot, ".env.local");
    
    if (existsSync(baseFile)) {
      dotenv.config({ path: baseFile, override: true });
    }
    
    if (existsSync(localFile)) {
      console.log("📂 Loading local overrides from .env.local");
      dotenv.config({ path: localFile, override: true });
    }
  }

  // Ensure crucial variables are present based on common usage
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("⚠️  DATABASE_URL is not defined in the current environment.");
  } else {
    // Mask sensitive info for logging
    const maskedUrl = dbUrl.replace(/:\/\/.*@/, "://***:***@");
    console.log(`✅ DATABASE_URL loaded: ${maskedUrl}`);
  }

  const appUrl = process.env.APP_URL;
  if (appUrl) {
    console.log(`✅ APP_URL loaded: ${appUrl}`);
  }
}
