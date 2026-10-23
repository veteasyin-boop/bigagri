import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { readLimitedBody } from "../_shared/read_limited_body.mjs";

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let mismatch = leftBytes.length ^ rightBytes.length;
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  for (let i = 0; i < maxLength; i += 1) {
    mismatch |= (leftBytes[i] ?? 0) ^ (rightBytes[i] ?? 0);
  }
  return mismatch === 0;
}

const RAZORPAY_PAYOUT_URL = "https://api.razorpay.com/v1/payouts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return respond(405, { ok: false, error: "method_not_allowed" });

  const expectedSecret = Deno.env.get("RAZORPAY_PROCESSOR_SECRET") ?? "";
  const suppliedSecret = req.headers.get("x-processor-secret") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

  // Authenticate via either processor secret or service role key
  const hasValidSecret = Boolean(expectedSecret && suppliedSecret && constantTimeEqual(suppliedSecret, expectedSecret));
  const hasValidServiceRole = Boolean(serviceRoleKey && authHeader.startsWith("Bearer ") && constantTimeEqual(authHeader.slice(7), serviceRoleKey));

  if (!hasValidSecret && !hasValidServiceRole) {
    return respond(401, { ok: false, error: "unauthorized" });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return respond(503, { ok: false, error: "service_not_configured" });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const bodyBytes = await readLimitedBody(req, 4096);
  let input: Record<string, unknown> = {};
  if (bodyBytes && bodyBytes.byteLength > 0) {
    try {
      input = JSON.parse(new TextDecoder("utf-8").decode(bodyBytes));
    } catch {
      return respond(400, { ok: false, error: "invalid_request" });
    }
  }

  const limit = Math.min(Math.max(Number(input.limit || 25), 1), 100);
  const targetPayoutId = typeof input.payout_id === "string" ? input.payout_id.trim() : null;
  const simulateMode = req.headers.get("x-simulate-success") === "true" || input.simulate === true;

  // Razorpay Payouts credentials
  const razorpayKeyId = Deno.env.get("RAZORPAY_PAYOUT_KEY_ID") || Deno.env.get("RAZORPAY_KEY_ID") || "";
  const razorpayKeySecret = Deno.env.get("RAZORPAY_PAYOUT_KEY_SECRET") || Deno.env.get("RAZORPAY_KEY_SECRET") || "";
  const razorpayAccount = Deno.env.get("RAZORPAY_PAYOUT_ACCOUNT") || "";
  const hasLiveGateway = Boolean(razorpayKeyId && razorpayKeySecret && razorpayAccount);

  let query = admin
    .from("upi_payout_queue")
    .select("id, tenant_id, partner_id, redemption_id, upi_vpa, amount_inr, status, attempts")
    .in("status", ["pending", "processing"])
    .lt("attempts", 3)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (targetPayoutId) {
    query = admin
      .from("upi_payout_queue")
      .select("id, tenant_id, partner_id, redemption_id, upi_vpa, amount_inr, status, attempts")
      .eq("id", targetPayoutId);
  }

  const { data: payouts, error: fetchErr } = await query;
  if (fetchErr) {
    return respond(500, { ok: false, error: "failed_to_query_payout_queue" });
  }

  const results: Array<{ id: string; status: string; utr?: string; error?: string }> = [];

  for (const payout of payouts || []) {
    const attemptCount = (payout.attempts || 0) + 1;

    // Transition to processing state
    await admin
      .from("upi_payout_queue")
      .update({ status: "processing", attempts: attemptCount })
      .eq("id", payout.id);

    if (hasLiveGateway && !simulateMode) {
      try {
        const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
        const amountPaise = Math.round(Number(payout.amount_inr) * 100);

        const rzpResponse = await fetch(RAZORPAY_PAYOUT_URL, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${credentials}`,
            "X-Payout-Idempotency": `payout_${payout.id}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account_number: razorpayAccount,
            fund_account: {
              account_type: "vpa",
              vpa: { address: payout.upi_vpa },
            },
            amount: amountPaise,
            currency: "INR",
            mode: "UPI",
            purpose: "payout",
            queue_if_low_balance: true,
            reference_id: payout.id,
            narration: "Growta RewardLoop Payout",
          }),
        });

        const rzpData = await rzpResponse.json();

        if (rzpResponse.ok && rzpData && !rzpData.error) {
          const isProcessed = rzpData.status === "processed";
          const utr = rzpData.utr || null;
          const status = isProcessed ? "paid" : "processing";

          await admin.from("upi_payout_queue").update({
            status,
            razorpay_payout_id: rzpData.id || null,
            utr_reference: utr,
            processed_at: isProcessed ? new Date().toISOString() : null,
          }).eq("id", payout.id);

          if (isProcessed) {
            await admin.from("redemptions").update({
              status: "fulfilled",
              fulfilled_at: new Date().toISOString(),
            }).eq("id", payout.redemption_id);
          }

          results.push({ id: payout.id, status, utr });
        } else {
          const errorDesc = rzpData?.error?.description || "razorpay_payout_rejected";
          const finalStatus = attemptCount >= 3 ? "failed" : "pending";

          await admin.from("upi_payout_queue").update({
            status: finalStatus,
            failure_reason: errorDesc,
          }).eq("id", payout.id);

          results.push({ id: payout.id, status: finalStatus, error: errorDesc });
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "network_error";
        const finalStatus = attemptCount >= 3 ? "failed" : "pending";

        await admin.from("upi_payout_queue").update({
          status: finalStatus,
          failure_reason: errMsg,
        }).eq("id", payout.id);

        results.push({ id: payout.id, status: finalStatus, error: errMsg });
      }
    } else if (simulateMode) {
      // Deterministic mock clearance for automated testing and sandbox environments
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const utr = `UPI/${timestamp}/UTR${Math.floor(1000000000 + Math.random() * 9000000000)}`;

      await admin.from("upi_payout_queue").update({
        status: "paid",
        utr_reference: utr,
        processed_at: new Date().toISOString(),
      }).eq("id", payout.id);

      await admin.from("redemptions").update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
      }).eq("id", payout.redemption_id);

      results.push({ id: payout.id, status: "paid", utr });
    } else {
      // Gateway credentials not configured yet; hold in pending state with informative reason
      await admin.from("upi_payout_queue").update({
        status: "pending",
        failure_reason: "awaiting_razorpay_credentials",
      }).eq("id", payout.id);

      results.push({ id: payout.id, status: "pending", error: "awaiting_razorpay_credentials" });
    }
  }

  return respond(200, {
    ok: true,
    processed_count: results.length,
    paid_count: results.filter(r => r.status === "paid").length,
    pending_count: results.filter(r => r.status === "pending").length,
    failed_count: results.filter(r => r.status === "failed").length,
    results,
  });
});
