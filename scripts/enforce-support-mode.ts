import fs from "fs";
import path from "path";

/**
 * Repository validation script for Support Mode v1
 * 
 * Ensures all admin actions that perform Prisma writes
 * are protected with requireWriteAccess().
 */

const ACTIONS_DIR = path.join(process.cwd(), "src", "actions");
const MUTATION_METHODS = ["create", "update", "delete", "upsert"];

function validateFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const errors: string[] = [];

  let currentFunction: string | null = null;
  let hasRequireWriteAccess = false;
  let functionStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function start (very basic heuristic)
    const funcMatch = line.match(/export async function (\w+)/);
    if (funcMatch) {
      currentFunction = funcMatch[1];
      hasRequireWriteAccess = false;
      functionStartLine = i + 1;
    }

    // Detect requireWriteAccess()
    if (line.includes("requireWriteAccess()")) {
      hasRequireWriteAccess = true;
    }

    // Detect mutations (db.model.create, tx.model.update, etc)
    const mutationMatch = MUTATION_METHODS.some((method) => 
      line.match(new RegExp(`\\.(?:db|tx)\\.\\w+\\.${method}\\(`)) ||
      line.match(new RegExp(`db\\.\\w+\\.${method}\\(`)) ||
      line.match(new RegExp(`tx\\.\\w+\\.${method}\\(`))
    );

    if (mutationMatch && currentFunction) {
      if (!hasRequireWriteAccess) {
        errors.push(
          `Violation in ${path.basename(filePath)}:${i + 1} - ` +
          `Function "${currentFunction}" (starting at line ${functionStartLine}) ` +
          `contains a mutation but is missing requireWriteAccess().`
        );
      }
    }

    // Detect end of function (very basic: closing brace at start of line)
    // This is brittle but often works for this codebase's style
    if (line.trim() === "}" && currentFunction) {
      currentFunction = null;
      hasRequireWriteAccess = false;
    }
  }

  return errors;
}

function main() {
  console.log("--- Support Mode v1 Enforcement Scan ---");
  
  const files = fs.readdirSync(ACTIONS_DIR)
    .filter(f => f.endsWith(".ts"))
    .map(f => path.join(ACTIONS_DIR, f));

  let totalErrors = 0;

  files.forEach(file => {
    const errors = validateFile(file);
    if (errors.length > 0) {
      console.error(`\nFound ${errors.length} violation(s) in ${path.relative(process.cwd(), file)}:`);
      errors.forEach(err => console.error(`  - ${err}`));
      totalErrors += errors.length;
    }
  });

  console.log("\n----------------------------------------");
  if (totalErrors > 0) {
    console.error(`Total Violations: ${totalErrors}`);
    process.exit(1);
  } else {
    console.log("✅ All admin actions passed Support Mode v1 validation.");
    process.exit(0);
  }
}

main();
