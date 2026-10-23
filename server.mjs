import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || process.argv[2] || "3000", 10);
const SUPABASE_REMOTE_HOST = "guhhuqxrobhuumwrypnc.supabase.co";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function makeMockJwt(userId, email) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: "supabase",
      sub: userId,
      aud: "authenticated",
      exp: now + 86400 * 30,
      nbf: now - 60,
      iat: now,
      role: "authenticated",
      email: email,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { full_name: "BigAgri Administrator" },
    })
  ).toString("base64url");
  const signature = Buffer.from("bigagri-local-dev-signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const MOCK_ADMIN_DASHBOARD = {
  ok: true,
  tenant: {
    id: "d0000000-0000-4000-8000-000000000001",
    name: "BigAgri / Growta RewardLoop",
    slug: "growta-rewardloop",
  },
  role: "super_admin",
  capabilities: {
    product_management: true,
    audit_log_viewer: true,
  },
  metrics: {
    partners_total: 48,
    partners_pending: 3,
    campaigns_active: 2,
    products_active: 4,
    qr_codes_issued_total: 12500,
    redemptions_open: 4,
    point_value_minor_units: 50,
    point_value_currency: "INR",
  },
  partners: [
    {
      id: "p-101",
      display_name: "Rameshwar Singh (Kisan Partner)",
      phone_e164: "+919876543210",
      role: "farmer",
      verification_status: "pending",
      created_at: "2026-10-23T10:30:00Z",
    },
    {
      id: "p-102",
      display_name: "Kisan Krishi Seva Kendra",
      phone_e164: "+919876512345",
      role: "retailer",
      verification_status: "verified",
      created_at: "2026-10-22T14:15:00Z",
    },
    {
      id: "p-103",
      display_name: "Gurpreet Dhillon",
      phone_e164: "+919812345678",
      role: "farmer",
      verification_status: "verified",
      created_at: "2026-10-21T09:00:00Z",
    },
    {
      id: "p-104",
      display_name: "Anand Agro Agencies",
      phone_e164: "+919845678901",
      role: "distributor",
      verification_status: "pending",
      created_at: "2026-10-23T11:00:00Z",
    },
  ],
  products: [
    {
      id: "prod-001",
      sku: "TOMATO-HYB-10G",
      name: "Hybrid Tomato Gold 10g",
      pack_size: "10 g",
      active: true,
    },
    {
      id: "prod-002",
      sku: "COTTON-BT-450G",
      name: "Bt Cotton Supreme Seed",
      pack_size: "450 g",
      active: true,
    },
    {
      id: "prod-003",
      sku: "BIO-FERT-1L",
      name: "Bio-Organic Growth Booster 1L",
      pack_size: "1 L",
      active: true,
    },
    {
      id: "prod-004",
      sku: "WHEAT-SHAR-40KG",
      name: "Sharbati Certified Wheat Seed",
      pack_size: "40 kg",
      active: true,
    },
  ],
  campaigns: [
    {
      id: "camp-001",
      name: "Rabi Season Pack Reward 2026",
      status: "active",
      starts_at: "2026-10-01T00:00:00Z",
      ends_at: "2026-12-31T23:59:59Z",
      budget_minor_units: 5000000,
      currency: "INR",
      rules: { demo: false },
    },
    {
      id: "camp-002",
      name: "Spring Early-Bird Kisan Bonus",
      status: "draft",
      starts_at: "2026-11-01T00:00:00Z",
      ends_at: "2026-11-30T23:59:59Z",
      budget_minor_units: 2000000,
      currency: "INR",
      rules: { demo: false },
    },
  ],
  batches: [
    {
      id: "batch-8841-a1b2-c3d4",
      requested_count: 500,
      points_value: 50,
      status: "issued",
      packaging_level: "carton",
      destination_state: "Punjab",
      retailer_margin_inr: 50,
    },
    {
      id: "batch-8842-e5f6-g7h8",
      requested_count: 250,
      points_value: 100,
      status: "issued",
      packaging_level: "unit",
      destination_state: "Haryana",
      retailer_margin_inr: 0,
    },
  ],
  redemptions: [
    {
      id: "red-01",
      reward_name: "Battery Spray Pump 16L",
      points_cost: 500,
      partner_name: "Rameshwar Singh",
      partner_phone: "+919876543210",
      status: "reserved",
      reward_is_demo: false,
      created_at: "2026-10-23T11:45:00Z",
    },
    {
      id: "red-02",
      reward_name: "High-Pressure Brass Nozzle Kit",
      points_cost: 150,
      partner_name: "Kisan Krishi Seva Kendra",
      partner_phone: "+919876512345",
      status: "approved",
      reward_is_demo: false,
      created_at: "2026-10-23T09:12:00Z",
    },
  ],
  audit_logs: [
    {
      action: "campaign_activated",
      entity_type: "campaign",
      entity_id: "camp-001",
      actor_user_id: "admin-system",
      reason: "Approved seasonal budget cap",
      created_at: "2026-10-23T10:00:00Z",
    },
    {
      action: "partner_verified",
      entity_type: "partner",
      entity_id: "p-102",
      actor_user_id: "admin-system",
      reason: "Retailer license verified",
      created_at: "2026-10-22T14:20:00Z",
    },
  ],
  pagination: {
    partners: { page: 0, page_size: 20, total: 4 },
    products: { page: 0, page_size: 20, total: 4 },
    campaigns: { page: 0, page_size: 20, total: 2 },
    batches: { page: 0, page_size: 20, total: 2 },
    redemptions: { page: 0, page_size: 20, total: 2 },
    audit: { page: 0, page_size: 20, total: 2 },
  },
  team: [
    {
      id: "tm-01",
      email: "admin@bigagri.com",
      display_name: "Super Administrator",
      role: "super_admin",
      status: "active",
      last_active: "2026-10-23T12:00:00Z",
    },
    {
      id: "tm-02",
      email: "operations@bigagri.com",
      display_name: "Brand Operations Lead",
      role: "brand_admin",
      status: "active",
      last_active: "2026-10-23T10:15:00Z",
    },
    {
      id: "tm-03",
      email: "finance@bigagri.com",
      display_name: "SaaS Tax & Billing Auditor",
      role: "finance_auditor",
      status: "active",
      last_active: "2026-10-22T17:30:00Z",
    },
    {
      id: "tm-04",
      email: "field.north@bigagri.com",
      display_name: "North Region Field Exec",
      role: "field_executive",
      status: "active",
      last_active: "2026-10-23T08:45:00Z",
    },
  ],
  traceability: [
    {
      id: "tr-001",
      batch_id: "batch-8841-a1b2",
      sku: "TOMATO-HYB-10G",
      stage: "farmer_claimed",
      stage_label: "Farmer Claimed",
      current_location: "Ludhiana, Punjab",
      allocated_state: "Punjab",
      packaging_level: "Unit Pack (500ml)",
      transit_status: "Verified Genuine",
      retailer_trade_status: "Kendra Trade Margin Credited (₹50)",
      anomaly: null,
      updated_at: "2026-10-23T11:45:00Z",
    },
    {
      id: "tr-002",
      batch_id: "batch-8841-a1b2",
      sku: "TOMATO-HYB-10G",
      stage: "retailer_received",
      stage_label: "Retailer Received",
      current_location: "Amritsar Hub, Punjab",
      allocated_state: "Punjab",
      packaging_level: "Shipper Carton (24 Units)",
      transit_status: "In Stock at Kendra",
      retailer_trade_status: "Kendra Trade Margin Claimed",
      anomaly: null,
      updated_at: "2026-10-23T10:10:00Z",
    },
    {
      id: "tr-003",
      batch_id: "batch-8842-e5f6",
      sku: "COTTON-BT-450G",
      stage: "warehouse_dispatched",
      stage_label: "Warehouse Dispatched",
      current_location: "Nagpur Central Logistics",
      allocated_state: "Maharashtra",
      packaging_level: "Master Pallet (40 Cartons)",
      transit_status: "En Route to Distributor",
      retailer_trade_status: "Pending Retail Arrival",
      anomaly: null,
      updated_at: "2026-10-22T16:00:00Z",
    },
    {
      id: "tr-004",
      batch_id: "batch-8842-e5f6",
      sku: "COTTON-BT-450G",
      stage: "farmer_claimed",
      stage_label: "Claim Attempted",
      current_location: "Bhatinda, Punjab",
      allocated_state: "Haryana",
      packaging_level: "Unit Pack",
      transit_status: "Flagged Suspicious",
      retailer_trade_status: "Withheld for Investigation",
      anomaly: "Territory Diversion: Stock allocated to Haryana scanned in Punjab (Cross-Border Leakage)",
      updated_at: "2026-10-23T12:05:00Z",
    },
  ],
  counterfeit_incidents: [
    {
      id: "inc-01",
      district: "Bhatinda, Punjab",
      batch_id: "batch-8842-e5f6",
      sku: "COTTON-BT-450G",
      severity: "high",
      attempt_count: 14,
      time_span: "Within last 2 hours",
      device_fingerprints: 6,
      ip_asns: ["AS133694 (Airtel 4G)", "AS55836 (Jio Infocomm)"],
      status: "active_investigation",
      recommended_action: "Lock Batch and Dispatch Regional FDO",
      created_at: "2026-10-23T12:15:00Z",
    },
    {
      id: "inc-02",
      district: "Karnal, Haryana",
      batch_id: "batch-8841-a1b2",
      sku: "TOMATO-HYB-10G",
      severity: "medium",
      attempt_count: 4,
      time_span: "Yesterday afternoon",
      device_fingerprints: 2,
      ip_asns: ["AS55836 (Jio Infocomm)"],
      status: "resolved",
      recommended_action: "Retailer Kendra Warning Issued",
      created_at: "2026-10-22T15:30:00Z",
    },
  ],
  mes_api_keys: [
    {
      id: "key-01",
      name: "Ludhiana Plant Packaging Line 02 (High-Speed Rotary)",
      key_prefix: "bg_live_mes_lud02_9f81",
      permissions: "batches:provision, codes:mint, cartons:aggregate",
      created_at: "2026-10-15T09:00:00Z",
      last_used: "12 minutes ago (480 packs minted)",
      status: "active",
    },
    {
      id: "key-02",
      name: "Nagpur Seed Processing MES (Master Pallet Line)",
      key_prefix: "bg_live_mes_nag01_4c28",
      permissions: "batches:provision, cartons:aggregate, pallets:bind",
      created_at: "2026-10-01T10:00:00Z",
      last_used: "Yesterday (25 Pallets bound)",
      status: "active",
    },
  ],
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(url.pathname);

  // 1. Supabase Local Development Proxy & Demo Mode
  if (pathname.startsWith("/supabase-proxy")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type, idempotency-key, accept");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const remotePath = pathname.replace(/^\/supabase-proxy/, "") + url.search;

    // Buffer the request body
    const bodyChunks = [];
    for await (const chunk of req) {
      bodyChunks.push(chunk);
    }
    const bodyBuffer = Buffer.concat(bodyChunks);
    const bodyText = bodyBuffer.toString("utf8");

    // Local Dev Sign-In Handler
    if (remotePath.startsWith("/auth/v1/token")) {
      let email = "admin@bigagri.com";
      try {
        const parsed = JSON.parse(bodyText);
        if (parsed.email) email = String(parsed.email).toLowerCase().trim();
      } catch {}

      const userId = "d0000000-0000-4000-8000-000000000099";
      const token = makeMockJwt(userId, email);
      const now = Math.floor(Date.now() / 1000);

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(
        JSON.stringify({
          access_token: token,
          token_type: "bearer",
          expires_in: 86400 * 30,
          expires_at: now + 86400 * 30,
          refresh_token: "mock-dev-refresh-token",
          user: {
            id: userId,
            aud: "authenticated",
            role: "authenticated",
            email: email,
            phone: "+919876500000",
            email_confirmed_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            app_metadata: { provider: "email", providers: ["email"] },
            user_metadata: { full_name: "BigAgri Administrator" },
            identities: [],
            created_at: "2026-10-23T12:00:00.000Z",
            updated_at: "2026-10-23T12:00:00.000Z",
          },
        })
      );
      return;
    }

    // Local Dev Auth User check
    if (remotePath.startsWith("/auth/v1/user")) {
      const userId = "d0000000-0000-4000-8000-000000000099";
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(
        JSON.stringify({
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          email: "admin@bigagri.com",
          email_confirmed_at: new Date().toISOString(),
          phone: "+919876500000",
          user_metadata: { full_name: "BigAgri Administrator" },
          app_metadata: { provider: "email", providers: ["email"] },
        })
      );
      return;
    }

    // Local Dev Edge Function: rewardloop-api
    if (remotePath.includes("/functions/v1/rewardloop-api")) {
      let bodyJson = {};
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {}

      if (bodyJson.action === "admin_tenants") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(
          JSON.stringify({
            ok: true,
            tenants: [
              {
                id: "d0000000-0000-4000-8000-000000000001",
                slug: "growta-rewardloop",
                name: "BigAgri / Growta RewardLoop",
                role: "super_admin",
              },
            ],
          })
        );
        return;
      }

      if (bodyJson.action === "admin_dashboard") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify(MOCK_ADMIN_DASHBOARD));
        return;
      }

      if (bodyJson.action === "admin_audit_logs") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(
          JSON.stringify({
            ok: true,
            logs: MOCK_ADMIN_DASHBOARD.audit_logs,
            pagination: { page: 0, page_size: 20, total: MOCK_ADMIN_DASHBOARD.audit_logs.length },
          })
        );
        return;
      }

      if (bodyJson.action === "invite_operator") {
        const { email, role } = bodyJson;
        if (!email || !role) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ ok: false, error: "Email and role are required." }));
          return;
        }
        MOCK_ADMIN_DASHBOARD.team.push({
          id: "tm-" + (MOCK_ADMIN_DASHBOARD.team.length + 1),
          email,
          display_name: email.split("@")[0],
          role,
          status: "invited",
          last_active: "Pending invitation acceptance",
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "revoke_operator") {
        const { operator_id } = bodyJson;
        MOCK_ADMIN_DASHBOARD.team = MOCK_ADMIN_DASHBOARD.team.filter((t) => t.id !== operator_id);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "issue_qr_batch") {
        const { count, points_value, packaging_level, destination_state, retailer_margin_inr } = bodyJson;
        const batchId = "batch-" + crypto.randomUUID().slice(0, 8);
        const codes = [];
        const n = Math.min(1000, Math.max(1, Number(count) || 25));
        for (let i = 1; i <= n; i++) {
          const qrId = "qr-" + crypto.randomUUID().slice(0, 8);
          const token = "growta-" + crypto.randomUUID().replace(/-/g, "");
          codes.push({
            ordinal: i,
            qr_id: qrId,
            token: token,
            qr_payload: `https://bigagri.vercel.app/?token=${token}`,
          });
        }
        MOCK_ADMIN_DASHBOARD.batches.unshift({
          id: batchId,
          requested_count: n,
          points_value: points_value || 10,
          status: "issued",
          packaging_level: packaging_level || "unit",
          destination_state: destination_state || "All-India General",
          retailer_margin_inr: Number(retailer_margin_inr) || 0,
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, batch_id: batchId, codes }));
        return;
      }

      if (bodyJson.action === "redeem") {
        const { reward_id, request_key, upi_vpa } = bodyJson;
        const utr = "UPI/" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "/UTR" + Math.floor(100000000 + Math.random() * 900000000);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, redemption_id: "red-" + crypto.randomUUID().slice(0, 8), utr, upi_vpa }));
        return;
      }

      if (bodyJson.action === "claim" || bodyJson.action === "assisted_claim") {
        const bonus = Math.floor(5 + Math.random() * 20);
        const ticketNumber = "RABI-2026-" + Math.floor(10000 + Math.random() * 90000);
        const isAssisted = Boolean(bodyJson.farmer_phone);
        const isScratchPin = Boolean(bodyJson.scratch_pin);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({
          ok: true,
          outcome: "accepted",
          points_added: 50,
          bonus_points: bonus,
          ticket_number: ticketNumber,
          prize_campaign: "Rabi 2026 Tractor & Sprayer Mega Lucky Draw",
          assisted: isAssisted,
          farmer_phone: bodyJson.farmer_phone || null,
          retailer_margin_credited_inr: isAssisted ? 50 : 0,
          verification_layer: isScratchPin ? "inner_scratch_pin" : "outer_pack_qr",
        }));
        return;
      }

      if (bodyJson.action === "fdo_audit_scan") {
        const token = String(bodyJson.token || "token-sample");
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({
          ok: true,
          token,
          verified: true,
          sku: "TOMATO-HYB-10G",
          product_name: "Hybrid Tomato Gold 10g",
          batch_id: "batch-8841-a1b2",
          packaging_level: "Unit Pack (Bottle/Pouch)",
          mfg_date: "2026-09-15",
          expiry_date: "2028-09-14",
          allocated_state: "Punjab (North Zone)",
          tamper_seal: "Secured · Genuine Tamper-Evident Matrix",
          current_stage: "Retail Shelf at Kisan Krishi Seva Kendra",
          claim_status: "Unclaimed · Eligible for Farmer Reward",
          non_destructive: true,
        }));
        return;
      }

      if (bodyJson.action === "create_mes_key") {
        const name = String(bodyJson.name || "Factory Line Packaging Key");
        const permissions = String(bodyJson.permissions || "batches:provision, codes:mint");
        const newKey = {
          id: "key-0" + (MOCK_ADMIN_DASHBOARD.mes_api_keys.length + 1),
          name,
          key_prefix: "bg_live_mes_" + crypto.randomUUID().slice(0, 8),
          permissions,
          created_at: new Date().toISOString(),
          last_used: "Never",
          status: "active",
        };
        MOCK_ADMIN_DASHBOARD.mes_api_keys.unshift(newKey);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, key: newKey }));
        return;
      }

      if (bodyJson.action === "revoke_mes_key") {
        const keyId = bodyJson.key_id;
        MOCK_ADMIN_DASHBOARD.mes_api_keys = MOCK_ADMIN_DASHBOARD.mes_api_keys.filter(k => k.id !== keyId);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "resolve_counterfeit_incident") {
        const incidentId = bodyJson.incident_id;
        const inc = MOCK_ADMIN_DASHBOARD.counterfeit_incidents.find(i => i.id === incidentId);
        if (inc) {
          inc.status = "contained_blacklisted";
          inc.recommended_action = "Batch Locked & Blacklisted from Replay Claims";
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (["verify_partner", "create_product", "set_product_status", "set_campaign_status", "create_campaign", "set_point_value", "resolve_redemption", "revoke_qr_batch"].includes(bodyJson.action)) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
    }

    // Local Dev Edge Function: saas-billing-portal
    if (remotePath.includes("/functions/v1/saas-billing-portal")) {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(
        JSON.stringify({
          ok: true,
          plans: [
            {
              plan_version_id: "c1f7a0b0-0000-4000-8000-000000000001",
              display_name: "Agri Retailer Starter",
              version_no: 1,
              trial_days: 14,
              currency: "INR",
              monthly_available: true,
              monthly_amount_minor: 199900,
              yearly_available: true,
              yearly_amount_minor: 1999900,
            },
            {
              plan_version_id: "c1f7a0b0-0000-4000-8000-000000000002",
              display_name: "Agri Enterprise & Brand",
              version_no: 1,
              trial_days: 30,
              currency: "INR",
              monthly_available: true,
              monthly_amount_minor: 499900,
              yearly_available: true,
              yearly_amount_minor: 4999900,
            },
          ],
          subscription: {
            plan_name: "Agri Retailer Starter",
            status: "active",
            billing_interval: "monthly",
            amount_minor: 199900,
            currency: "INR",
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            current_period_end: new Date(Date.now() + 86400000 * 25).toISOString(),
          },
        })
      );
      return;
    }

    // Local Dev Edge Function: saas-checkout-reconciliation
    if (remotePath.includes("/functions/v1/saas-checkout-reconciliation")) {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ ok: true, checkouts: [] }));
      return;
    }

    // Local Dev Edge Function: rewardloop-admin-settings
    if (remotePath.includes("/functions/v1/rewardloop-admin-settings")) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end(
        JSON.stringify({
          ok: true,
          settings: {
            email_provider: "resend",
            sender_email: "rewards@bigagri.com",
            sender_name: "BigAgri RewardLoop",
            site_url: "http://localhost:3000",
            allow_signup: true,
            require_email_confirm: true,
          },
        })
      );
      return;
    }

    // Forward to remote Supabase
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    headers["host"] = SUPABASE_REMOTE_HOST;
    headers["origin"] = "https://bigagri.vercel.app";
    headers["referer"] = "https://bigagri.vercel.app/";
    headers["content-length"] = Buffer.byteLength(bodyBuffer);

    const proxyReq = https.request(
      {
        hostname: SUPABASE_REMOTE_HOST,
        port: 443,
        path: remotePath,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        const responseHeaders = { ...proxyRes.headers };
        responseHeaders["access-control-allow-origin"] = "*";
        responseHeaders["access-control-allow-headers"] = "*";
        delete responseHeaders["content-security-policy"];

        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", (err) => {
      console.error("Local proxy error:", err.message);
      res.writeHead(502, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ ok: false, error: "local_proxy_connection_failed" }));
    });

    proxyReq.write(bodyBuffer);
    proxyReq.end();
    return;
  }

  // 2. Static File Serving
  if (pathname === "/" || pathname === "") {
    pathname = "/index.html";
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=()");

  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Growta RewardLoop local server running at:`);
  console.log(`  - Local:   http://localhost:${PORT}/`);
  console.log(`  - Admin:   http://localhost:${PORT}/admin.html`);
  console.log(`  - Billing: http://localhost:${PORT}/admin-billing.html`);
  console.log(`  - Settings:http://localhost:${PORT}/admin-settings.html`);
  console.log(`  - Dev Admin Login: admin@bigagri.com / admin12345`);
});
