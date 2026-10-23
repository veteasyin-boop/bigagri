import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../migrations/20261024200000_upi_payout_queue.sql", import.meta.url), "utf8");
const processFunction = readFileSync(new URL("../functions/process-upi-payout/index.ts", import.meta.url), "utf8");
const apiFunction = readFileSync(new URL("../functions/rewardloop-api/index.ts", import.meta.url), "utf8");
const appClient = readFileSync(new URL("../../app.js", import.meta.url), "utf8");
const adminClient = readFileSync(new URL("../../admin.js", import.meta.url), "utf8");

test("upi_payout_queue migration defines strict schema, constraints, and RLS", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.upi_payout_queue/);
  assert.match(migration, /tenant_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.tenants\(id\)/);
  assert.match(migration, /partner_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.partners\(id\)/);
  assert.match(migration, /redemption_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.redemptions\(id\)\s+ON\s+DELETE\s+RESTRICT\s+UNIQUE/);
  assert.match(migration, /amount_inr\s+numeric\(10,2\)\s+NOT\s+NULL\s+CHECK\s*\(amount_inr\s*>\s*0\)/);
  assert.match(migration, /status\s+text\s+NOT\s+NULL\s+DEFAULT\s*'pending'/);
  assert.match(migration, /CHECK\s*\(status\s+IN\s+\('pending',\s*'processing',\s*'paid',\s*'failed',\s*'reversed'\)\)/);
  assert.match(migration, /ALTER TABLE public\.upi_payout_queue ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE public\.upi_payout_queue/);
  assert.match(migration, /CREATE POLICY "partner_reads_own_payouts"/);
  assert.match(migration, /CREATE POLICY "admin_reads_tenant_payouts"/);
});

test("process-upi-payout Edge Function authenticates via processor secret or service role", () => {
  assert.match(processFunction, /RAZORPAY_PROCESSOR_SECRET/);
  assert.match(processFunction, /x-processor-secret/);
  assert.match(processFunction, /constantTimeEqual/);
  assert.match(processFunction, /respond\(401/);
  assert.match(processFunction, /unauthorized/);
  assert.match(processFunction, /readLimitedBody\(req,\s*4096\)/);
});

test("process-upi-payout sends idempotent requests to Razorpay Payouts API", () => {
  assert.match(processFunction, /https:\/\/api\.razorpay\.com\/v1\/payouts/);
  assert.match(processFunction, /"X-Payout-Idempotency":\s*`payout_\$\{payout\.id\}`/);
  assert.match(processFunction, /mode:\s*"UPI"/);
  assert.match(processFunction, /purpose:\s*"payout"/);
  assert.match(processFunction, /queue_if_low_balance:\s*true/);
  assert.match(processFunction, /attempts:\s*attemptCount/);
});

test("rewardloop-api validates UPI VPA format and queues payout upon redemption", () => {
  assert.match(apiFunction, /upi_payout_status/);
  assert.match(apiFunction, /admin_upi_payouts/);
  assert.match(apiFunction, /vpaRegex\s*=\s*\/.*\^\[a-zA-Z0-9/);
  assert.match(apiFunction, /invalid_upi_vpa/);
  assert.match(apiFunction, /from\("upi_payout_queue"\)\.insert/);
  assert.match(apiFunction, /payout_status:\s*payoutRecord\?\.status/);
});

test("app client eliminates fake client-side Math.random UTR and renders honest queued UX", () => {
  // Ensure no client-side Math.random UTR fabrication in redemption receipt
  assert.doesNotMatch(appClient, /Math\.random\(\)\s*\*\s*900000000\s*\)\s*,\s*amount/);
  assert.match(appClient, /loadPartnerPayouts\(tenantId,\s*partnerId\)/);
  assert.match(appClient, /state\.payouts\s*=\s*payouts/);
  assert.match(appClient, /UPI Queued ⏳/);
  assert.match(appClient, /UPI Payout Queued/);
  assert.match(appClient, /showUpiReceiptModal/);
});

test("admin control room exposes UPI payout status in redemption queue", () => {
  assert.match(adminClient, /admin_upi_payouts/);
  assert.match(adminClient, /UPI:/);
  assert.match(adminClient, /r\.payout_status/);
});
