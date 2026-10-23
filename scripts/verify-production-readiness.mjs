#!/usr/bin/env node

/**
 * Production Readiness & Release Pre-flight Checker for Growta RewardLoop
 * Checks all local code, tests, assets, and summarizes remote production release requirements.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

console.log("\n=======================================================");
console.log(" Growta RewardLoop — Production Readiness Verification ");
console.log("=======================================================\n");

let passed = true;

function check(name, fn) {
  try {
    process.stdout.write(`⏳ ${name}... `);
    fn();
    console.log("✅ OK");
  } catch (err) {
    console.log("❌ FAILED");
    console.error(`   Error: ${err.message}`);
    passed = false;
  }
}

// 1. JavaScript Syntax Check
check("Validating JavaScript entry points syntax", () => {
  const files = [
    "app.js",
    "admin.js",
    "admin-settings.js",
    "admin-billing.js",
    "register-brand.js",
    "sw.js",
    "server.mjs"
  ];
  for (const f of files) {
    execSync(`node --check ${f}`, { cwd: root, stdio: "pipe" });
  }
});

// 2. Asset Integrity Check
check("Checking HTML referenced assets and PWA manifest", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  if (!manifest.icons || manifest.icons.length === 0) {
    throw new Error("No icons defined in manifest.webmanifest");
  }
  for (const icon of manifest.icons) {
    const iconPath = path.join(root, icon.src.replace(/^\//, ""));
    if (!fs.existsSync(iconPath)) {
      throw new Error(`Missing icon file: ${icon.src}`);
    }
  }

  const htmlFiles = ["index.html", "admin.html", "admin-settings.html", "admin-billing.html"];
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(path.join(root, htmlFile), "utf8");
    const matches = content.matchAll(/(?:src|href)\s*=\s*["']([^"'#]+)["']/gi);
    for (const match of matches) {
      const val = match[1].trim();
      if (!val || /^(?:https?:|data:|mailto:|tel:|javascript:|\/\/)/i.test(val)) continue;
      const localPath = path.join(root, val.split(/[?#]/)[0].replace(/^\//, ""));
      if (!fs.existsSync(localPath)) {
        throw new Error(`Broken link in ${htmlFile} to ${val}`);
      }
    }
  }
});

// 3. Automated Test Suite (162 tests)
check("Executing full Node.js contract & security test suite (162 tests)", () => {
  execSync("node --test supabase/tests/*.test.mjs", { cwd: root, stdio: "pipe" });
});

// 4. Migrations & Baseline Check
check("Validating migrations structure", () => {
  const baseline = path.join(root, "supabase/migrations/20261021083000_rewardloop_schema_baseline.sql");
  if (!fs.existsSync(baseline)) {
    throw new Error("Baseline schema migration missing");
  }
  const migrations = fs.readdirSync(path.join(root, "supabase/migrations")).filter(f => f.endsWith(".sql"));
  if (migrations.length < 40) {
    throw new Error(`Expected at least 40 migration files, found ${migrations.length}`);
  }
});

// 5. Vercel headers check
check("Checking vercel.json security headers", () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  if (!vercel.headers || vercel.headers.length === 0) {
    throw new Error("No security headers in vercel.json");
  }
});

console.log("\n-------------------------------------------------------");
if (passed) {
  console.log("🎉 Local Verification: ALL AUTOMATED CHECKS PASSED!");
} else {
  console.log("⚠️ Local Verification: SOME CHECKS FAILED!");
}
console.log("-------------------------------------------------------\n");

console.log("📋 Outstanding Remote Release Prerequisites Checklist:");
console.log(" 1. [ ] Supabase Auth: Enable Leaked Password Protection (HIBP)");
console.log("        -> Navigate to Supabase Dashboard > Authentication > Security Settings");
console.log(" 2. [ ] Supabase Auth: Verify Custom SMTP & Email Confirmation");
console.log("        -> Connect custom SMTP provider (Resend, SendGrid, etc.)");
console.log(" 3. [ ] Vercel: Wait for 24-hour deployment quota reset (or upgrade plan)");
console.log("        -> Ensure latest commit is assigned to https://bigagri.vercel.app");
console.log(" 4. [ ] Run Controlled Release Workflow on GitHub Actions:");
console.log("        -> Action: 'RewardLoop controlled production release'");
console.log("        -> Repair baseline history (20261021083000)");
console.log("        -> Apply pending migrations (20261021170000 onwards)");
console.log("        -> Deploy 8 Edge Functions");
console.log(" 5. [ ] Deprecate & Retire the 6 legacy Edge Functions (verify_jwt=false)");
console.log(" 6. [ ] SaaS Billing: Configure Razorpay test keys and run test-mode verification\n");
