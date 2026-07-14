#!/usr/bin/env node

import { execSync } from "child_process";
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { cwd } from "process";

/**
 * Dependency Update Script
 *
 * This script checks for the latest stable non-breaking versions of dependencies
 * and updates package.json with exact versions (no ^ or ~ prefixes).
 * Only considers proper major.minor.patch versions (no pre-release versions).
 *
 * Usage:
 *   node scripts/update-dependencies.mjs [patch|minor|major]
 *
 * Options:
 *   patch (default) - Only update patch versions (1.2.3 -> 1.2.4)
 *   minor           - Update patch and minor versions (1.2.3 -> 1.3.0)
 *   major           - Update to latest version including major (1.2.3 -> 2.0.0)
 *
 * Features:
 * - Supports monorepo: recursively finds all package.json files
 * - Converts all version constraints (^, ~) to exact versions
 * - Only considers stable releases (no rc, beta, alpha, etc.)
 * - Respects update level (patch/minor/major)
 * - Creates backup before making changes
 */

const ROOT_DIR = cwd();

// Directories to ignore when searching for package.json files
const IGNORE_DIRS = ["node_modules", ".git", "dist", "build", ".next", "coverage"];

/**
 * Recursively find all package.json files in the workspace
 */
function findPackageJsonFiles(dir, files = []) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    try {
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip ignored directories
        if (IGNORE_DIRS.includes(entry)) {
          continue;
        }
        findPackageJsonFiles(fullPath, files);
      } else if (entry === "package.json") {
        files.push(fullPath);
      }
    } catch {
      // Skip files/directories we can't access
      continue;
    }
  }

  return files;
}

// Parse command-line arguments
const args = process.argv.slice(2);
const updateLevel = args[0] || "patch"; // default to patch

if (!["patch", "minor", "major"].includes(updateLevel)) {
  log(`❌ Invalid update level: ${updateLevel}`, "red");
  log(`   Valid options: patch, minor, major`, "yellow");
  process.exit(1);
}

// Color codes for console output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
};

function log(message, color = "white") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logBright(message, color = "white") {
  console.log(`${colors.bright}${colors[color]}${message}${colors.reset}`);
}

/**
 * Check if a version is a workspace dependency (local monorepo package)
 */
function isWorkspaceDependency(version) {
  return version.startsWith("workspace:");
}

/**
 * Check if a version is a proper stable version (major.minor.patch only)
 */
function isStableVersion(version) {
  // Check if version matches exactly major.minor.patch pattern
  const stableVersionPattern = /^\d+\.\d+\.\d+$/;
  return stableVersionPattern.test(version);
}

/**
 * Get the latest stable version based on the specified update level
 */
async function getLatestCompatibleVersion(packageName, currentVersion, updateLevel) {
  try {
    // Get package information from npm
    const result = execSync(`npm view ${packageName} versions --json`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"], // Suppress stderr to avoid noise
    });

    const versions = JSON.parse(result);
    const allVersions = Array.isArray(versions) ? versions : [versions];

    // Filter to only stable versions (major.minor.patch)
    const stableVersions = allVersions.filter(isStableVersion);

    if (stableVersions.length === 0) {
      log(`  ⚠️  No stable versions found for ${packageName}`, "yellow");
      return currentVersion;
    }

    // Clean current version (remove ^, ~, etc.)
    const cleanCurrentVersion = currentVersion.replace(/^[\^~>=<]/, "");

    // Parse current version parts
    const currentParts = cleanCurrentVersion.split(".");
    const currentMajor = parseInt(currentParts[0]) || 0;
    const currentMinor = parseInt(currentParts[1]) || 0;
    const currentPatch = parseInt(currentParts[2]) || 0;

    // Filter versions based on update level
    const compatibleVersions = stableVersions.filter((version) => {
      const parts = version.split(".");
      const major = parseInt(parts[0]) || 0;
      const minor = parseInt(parts[1]) || 0;
      const patch = parseInt(parts[2]) || 0;

      switch (updateLevel) {
        case "patch":
          // Only allow patch updates within same major.minor
          return major === currentMajor && minor === currentMinor && patch >= currentPatch;

        case "minor":
          // Allow minor and patch updates within same major
          return major === currentMajor && (minor > currentMinor || (minor === currentMinor && patch >= currentPatch));

        case "major":
          // Allow any version that's >= current version
          if (major > currentMajor) return true;
          if (major < currentMajor) return false;
          if (minor > currentMinor) return true;
          if (minor < currentMinor) return false;
          return patch >= currentPatch;

        default:
          return false;
      }
    });

    if (compatibleVersions.length === 0) {
      // If no compatible versions found, at least convert to exact version
      return cleanCurrentVersion;
    }

    // Sort versions and get the latest compatible one
    const sortedVersions = compatibleVersions.sort((a, b) => {
      const aParts = a.split(".").map((x) => parseInt(x) || 0);
      const bParts = b.split(".").map((x) => parseInt(x) || 0);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        if (aPart !== bPart) return bPart - aPart; // Descending order
      }
      return 0;
    });

    const latestCompatible = sortedVersions[0];

    // Always return exact version (no ^ or ~ prefix)
    return latestCompatible;
  } catch (error) {
    log(`  ❌ Error checking ${packageName}: ${error.message}`, "red");
    // Convert current version to exact even on error
    return currentVersion.replace(/^[\^~>=<]/, "");
  }
}

/**
 * Check if a version needs updating (including conversion to exact version)
 */
function needsUpdate(current, latest) {
  const cleanCurrent = current.replace(/^[\^~>=<]/, "");
  const cleanLatest = latest.replace(/^[\^~>=<]/, "");

  // Update if versions are different OR if current has prefix (needs conversion to exact)
  const versionsDifferent = cleanCurrent !== cleanLatest;
  const hasPrefix = current.match(/^[\^~>=<]/);

  return versionsDifferent || hasPrefix;
}

/**
 * Process a single package.json file
 */
async function processPackageJson(packageJsonPath) {
  const relativePath = relative(ROOT_DIR, packageJsonPath) || "package.json";
  const backupPath = packageJsonPath + ".backup";

  logBright(`\n📁 Processing: ${relativePath}`, "magenta");

  // Create backup
  try {
    copyFileSync(packageJsonPath, backupPath);
    log(`📋 Backup created`, "yellow");
  } catch (error) {
    log(`❌ Failed to create backup: ${error.message}`, "red");
    return { updates: 0, backupPath: null };
  }

  // Read package.json
  let packageJson;
  try {
    const content = readFileSync(packageJsonPath, "utf-8");
    packageJson = JSON.parse(content);
  } catch (error) {
    log(`❌ Failed to read package.json: ${error.message}`, "red");
    return { updates: 0, backupPath };
  }

  const updates = {
    dependencies: [],
    devDependencies: [],
  };

  // Process dependencies
  if (packageJson.dependencies) {
    log("\n  📦 Checking dependencies...", "blue");

    for (const [packageName, currentVersion] of Object.entries(packageJson.dependencies)) {
      // Skip workspace dependencies (local monorepo packages)
      if (isWorkspaceDependency(currentVersion)) {
        log(`    ⏭️  ${packageName}: skipped (workspace dependency)`, "yellow");
        continue;
      }

      log(`    Checking ${packageName}@${currentVersion}...`, "white");

      const latestVersion = await getLatestCompatibleVersion(packageName, currentVersion, updateLevel);

      if (needsUpdate(currentVersion, latestVersion)) {
        packageJson.dependencies[packageName] = latestVersion;
        updates.dependencies.push({
          name: packageName,
          from: currentVersion,
          to: latestVersion,
        });
        log(`    ✅ ${packageName}: ${currentVersion} → ${latestVersion}`, "green");
      } else {
        log(`    ℹ️  ${packageName}: already up to date`, "cyan");
      }
    }
  }

  // Process devDependencies
  if (packageJson.devDependencies) {
    log("\n  🛠️  Checking devDependencies...", "blue");

    for (const [packageName, currentVersion] of Object.entries(packageJson.devDependencies)) {
      // Skip workspace dependencies (local monorepo packages)
      if (isWorkspaceDependency(currentVersion)) {
        log(`    ⏭️  ${packageName}: skipped (workspace dependency)`, "yellow");
        continue;
      }

      log(`    Checking ${packageName}@${currentVersion}...`, "white");

      const latestVersion = await getLatestCompatibleVersion(packageName, currentVersion, updateLevel);

      if (needsUpdate(currentVersion, latestVersion)) {
        packageJson.devDependencies[packageName] = latestVersion;
        updates.devDependencies.push({
          name: packageName,
          from: currentVersion,
          to: latestVersion,
        });
        log(`    ✅ ${packageName}: ${currentVersion} → ${latestVersion}`, "green");
      } else {
        log(`    ℹ️  ${packageName}: already up to date`, "cyan");
      }
    }
  }

  // Write updated package.json
  const totalUpdates = updates.dependencies.length + updates.devDependencies.length;

  if (totalUpdates > 0) {
    try {
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
      log(`\n  ✅ Updated with ${totalUpdates} package updates!`, "green");

      if (updates.dependencies.length > 0) {
        log(`\n    Dependencies (${updates.dependencies.length} updates):`, "blue");
        updates.dependencies.forEach((update) => {
          log(`      • ${update.name}: ${update.from} → ${update.to}`, "white");
        });
      }

      if (updates.devDependencies.length > 0) {
        log(`\n    DevDependencies (${updates.devDependencies.length} updates):`, "blue");
        updates.devDependencies.forEach((update) => {
          log(`      • ${update.name}: ${update.from} → ${update.to}`, "white");
        });
      }
    } catch (error) {
      log(`❌ Failed to write package.json: ${error.message}`, "red");
      return { updates: 0, backupPath };
    }
  } else {
    log("\n  ✅ All dependencies are already up to date!", "green");

    // Clean up backup since no changes were made
    try {
      unlinkSync(backupPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  return { updates: totalUpdates, backupPath: totalUpdates > 0 ? backupPath : null };
}

/**
 * Update dependencies in all package.json files in the monorepo
 */
async function updateDependencies() {
  logBright("🔍 Dependency Update Script Starting...", "cyan");
  logBright(`📝 Update level: ${updateLevel.toUpperCase()}`, "magenta");
  logBright(`📂 Workspace: ${ROOT_DIR}`, "blue");

  // Find all package.json files
  const packageJsonFiles = findPackageJsonFiles(ROOT_DIR);

  if (packageJsonFiles.length === 0) {
    log("❌ No package.json files found in the workspace", "red");
    process.exit(1);
  }

  log(`\n📦 Found ${packageJsonFiles.length} package.json file(s):`, "cyan");
  packageJsonFiles.forEach((file) => {
    log(`   • ${relative(ROOT_DIR, file) || "package.json"}`, "white");
  });

  const results = [];
  const backupFiles = [];

  // Process each package.json
  for (const packageJsonPath of packageJsonFiles) {
    const result = await processPackageJson(packageJsonPath);
    results.push({
      path: packageJsonPath,
      ...result,
    });
    if (result.backupPath) {
      backupFiles.push(result.backupPath);
    }
  }

  // Final summary
  const totalUpdates = results.reduce((sum, r) => sum + r.updates, 0);
  const filesUpdated = results.filter((r) => r.updates > 0).length;

  logBright("\n" + "=".repeat(60), "magenta");
  logBright("📊 Final Summary:", "magenta");
  log(`   Total files processed: ${packageJsonFiles.length}`, "white");
  log(`   Files with updates: ${filesUpdated}`, "white");
  log(`   Total package updates: ${totalUpdates}`, "white");

  if (totalUpdates > 0) {
    logBright("\n🎉 Next steps:", "yellow");
    log('  1. Run "pnpm install" to install the updated packages', "white");
    log("  2. Test your application to ensure everything works correctly", "white");
    log("  3. If there are issues, backups are available with .backup extension", "white");
  } else {
    logBright("\n🎉 All dependencies across the monorepo are already up to date!", "green");
  }
}

// Handle process termination
process.on("SIGINT", () => {
  log("\n\n❌ Process interrupted. Restoring backups...", "red");

  // Find and restore all backup files
  const backupFiles = findPackageJsonFiles(ROOT_DIR)
    .map((f) => f + ".backup")
    .filter((f) => existsSync(f));

  for (const backupPath of backupFiles) {
    try {
      const originalPath = backupPath.replace(".backup", "");
      copyFileSync(backupPath, originalPath);
      unlinkSync(backupPath);
      log(`✅ Restored: ${relative(ROOT_DIR, originalPath)}`, "green");
    } catch (error) {
      log(`❌ Failed to restore ${backupPath}: ${error.message}`, "red");
    }
  }

  process.exit(0);
});

// Check if npm is available
try {
  execSync("npm --version", { stdio: "ignore" });
} catch {
  log("❌ npm is not available. Please ensure npm is installed and in your PATH.", "red");
  process.exit(1);
}

// Run the update process
updateDependencies().catch((error) => {
  log(`❌ Unexpected error: ${error.message}`, "red");

  // Try to restore all backups on error
  const backupFiles = findPackageJsonFiles(ROOT_DIR)
    .map((f) => f + ".backup")
    .filter((f) => existsSync(f));

  for (const backupPath of backupFiles) {
    try {
      const originalPath = backupPath.replace(".backup", "");
      copyFileSync(backupPath, originalPath);
      unlinkSync(backupPath);
      log(`✅ Restored: ${relative(ROOT_DIR, originalPath)}`, "yellow");
    } catch (restoreError) {
      log(`❌ Failed to restore ${backupPath}: ${restoreError.message}`, "red");
    }
  }

  process.exit(1);
});
