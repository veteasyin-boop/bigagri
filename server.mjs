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
      payout_status: "pending",
      payout_vpa: "rameshwar@upi",
      payout_utr: null,
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
      payout_status: "paid",
      payout_vpa: "kisan@okicici",
      payout_utr: "CMS293847291048",
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

const MOCK_PUNJAB_DASHBOARD = {
  ok: true,
  tenant: {
    id: "d0000000-0000-4000-8000-000000000002",
    name: "Punjab Kisan Agro Bio-Tech",
    slug: "punjab-kisan-agro",
  },
  role: "brand_admin",
  capabilities: {
    product_management: true,
    audit_log_viewer: true,
  },
  metrics: {
    partners_total: 24,
    partners_pending: 1,
    campaigns_active: 1,
    products_active: 3,
    qr_codes_issued_total: 6200,
    redemptions_open: 2,
    point_value_minor_units: 100,
    point_value_currency: "INR",
  },
  partners: [
    {
      id: "p-pb-101",
      display_name: "Gurpreet Dhillon (Kisan Partner)",
      phone_e164: "+919812345678",
      role: "farmer",
      verification_status: "verified",
      created_at: "2026-10-21T09:00:00Z",
    },
    {
      id: "p-pb-102",
      display_name: "Malwa Kisan Seva Kendra",
      phone_e164: "+919876599901",
      role: "retailer",
      verification_status: "verified",
      created_at: "2026-10-22T14:15:00Z",
    },
    {
      id: "p-pb-103",
      display_name: "Amritsar Agro Inputs & Seeds",
      phone_e164: "+919876599902",
      role: "distributor",
      verification_status: "pending",
      created_at: "2026-10-23T10:30:00Z",
    },
    {
      id: "p-pb-104",
      display_name: "Harvinder Singh Sandhu",
      phone_e164: "+919876599903",
      role: "farmer",
      verification_status: "verified",
      created_at: "2026-10-20T08:00:00Z",
    },
  ],
  products: [
    {
      id: "prod-pb-001",
      sku: "BASMATI-GOLD-25KG",
      name: "Basmati Gold Supreme Seed 25kg",
      pack_size: "25 kg",
      active: true,
    },
    {
      id: "prod-pb-002",
      sku: "SARSON-PIONEER-5KG",
      name: "Mustard Sarson Pioneer Seed 5kg",
      pack_size: "5 kg",
      active: true,
    },
    {
      id: "prod-pb-003",
      sku: "ZINC-CHELATE-1L",
      name: "Chelated Zinc Micro-Nutrient 1L",
      pack_size: "1 L",
      active: true,
    },
  ],
  campaigns: [
    {
      id: "camp-pb-01",
      name: "Malwa Wheat & Mustard Loyalty Boost 2026",
      status: "active",
      starts_at: "2026-10-01T00:00:00Z",
      ends_at: "2026-12-31T23:59:59Z",
      budget_minor_units: 2500000,
      currency: "INR",
      rules: { demo: false },
    },
  ],
  batches: [
    {
      id: "batch-pb-8801",
      requested_count: 500,
      points_value: 50,
      status: "issued",
      packaging_level: "carton",
      destination_state: "Punjab",
      retailer_margin_inr: 50,
    },
    {
      id: "batch-pb-8802",
      requested_count: 250,
      points_value: 100,
      status: "issued",
      packaging_level: "unit",
      destination_state: "Punjab",
      retailer_margin_inr: 0,
    },
  ],
  redemptions: [
    {
      id: "red-pb-01",
      reward_name: "Battery Spray Pump 16L",
      points_cost: 500,
      partner_name: "Gurpreet Dhillon",
      partner_phone: "+919812345678",
      status: "fulfilled",
      payout_status: "paid",
      payout_vpa: "gurpreet@okhdfcbank",
      payout_utr: "PUNB0293847192",
      reward_is_demo: false,
      created_at: "2026-10-23T11:45:00Z",
    },
    {
      id: "red-pb-02",
      reward_name: "High-Pressure Brass Nozzle Kit",
      points_cost: 150,
      partner_name: "Malwa Kisan Seva Kendra",
      partner_phone: "+919876599901",
      status: "approved",
      payout_status: "pending",
      payout_vpa: "malwa@upi",
      payout_utr: null,
      reward_is_demo: false,
      created_at: "2026-10-23T09:12:00Z",
    },
  ],
  audit_logs: [
    {
      action: "campaign_activated",
      entity_type: "campaign",
      entity_id: "camp-pb-01",
      actor_user_id: "admin-punjab",
      reason: "Approved Malwa seasonal loyalty campaign",
      created_at: "2026-10-23T08:00:00Z",
    },
    {
      action: "partner_verified",
      entity_type: "partner",
      entity_id: "p-pb-101",
      actor_user_id: "admin-punjab",
      reason: "Verified Punjab Kisan Card identity",
      created_at: "2026-10-22T11:00:00Z",
    },
  ],
  pagination: {
    partners: { page: 0, page_size: 20, total: 4 },
    products: { page: 0, page_size: 20, total: 3 },
    campaigns: { page: 0, page_size: 20, total: 1 },
    batches: { page: 0, page_size: 20, total: 2 },
    redemptions: { page: 0, page_size: 20, total: 2 },
    audit: { page: 0, page_size: 20, total: 2 },
  },
  team: [
    {
      id: "tm-pb-01",
      email: "admin@punjabagro.com",
      display_name: "Punjab Operations Lead",
      role: "brand_admin",
      status: "active",
      last_active: "2026-10-23T12:00:00Z",
    },
    {
      id: "tm-pb-02",
      email: "field.malwa@punjabagro.com",
      display_name: "Malwa Regional Field Exec",
      role: "field_executive",
      status: "active",
      last_active: "2026-10-23T10:15:00Z",
    },
  ],
  traceability: [
    {
      id: "tr-pb-001",
      batch_id: "batch-pb-8801",
      sku: "BASMATI-GOLD-25KG",
      stage: "farmer_claimed",
      stage_label: "Farmer Claimed",
      current_location: "Ludhiana, Punjab",
      allocated_state: "Punjab",
      packaging_level: "Shipper Bag (25kg)",
      transit_status: "Verified Genuine",
      retailer_trade_status: "Kendra Trade Margin Credited (₹50)",
      anomaly: null,
      updated_at: "2026-10-23T11:45:00Z",
    },
    {
      id: "tr-pb-002",
      batch_id: "batch-pb-8801",
      sku: "SARSON-PIONEER-5KG",
      stage: "retailer_received",
      stage_label: "Retailer Received",
      current_location: "Amritsar Hub, Punjab",
      allocated_state: "Punjab",
      packaging_level: "Carton (5 Units)",
      transit_status: "In Stock at Kendra",
      retailer_trade_status: "Kendra Trade Margin Claimed",
      anomaly: null,
      updated_at: "2026-10-23T10:10:00Z",
    },
  ],
  counterfeit_incidents: [
    {
      id: "inc-pb-01",
      district: "Bhatinda, Punjab",
      batch_id: "batch-pb-8801",
      sku: "BASMATI-GOLD-25KG",
      severity: "high",
      attempt_count: 8,
      time_span: "Within last 3 hours",
      device_fingerprints: 4,
      ip_asns: ["AS133694 (Airtel 4G)"],
      status: "active_investigation",
      recommended_action: "Dispatch Regional FDO & Blacklist Serial Range",
      created_at: "2026-10-23T12:15:00Z",
    },
  ],
  mes_api_keys: [
    {
      id: "key-pb-01",
      name: "Ludhiana Plant Packaging Line 01 (High-Speed Rotary)",
      key_prefix: "bg_live_mes_lud01_77a1",
      permissions: "batches:provision, codes:mint",
      created_at: "2026-10-15T09:00:00Z",
      last_used: "18 minutes ago (320 packs minted)",
      status: "active",
    },
  ],
};

const MOCK_DECCAN_DASHBOARD = {
  ok: true,
  tenant: {
    id: "d0000000-0000-4000-8000-000000000003",
    name: "Deccan Crop Protection Kendra",
    slug: "deccan-crop-west",
  },
  role: "brand_admin",
  capabilities: {
    product_management: true,
    audit_log_viewer: true,
  },
  metrics: {
    partners_total: 31,
    partners_pending: 2,
    campaigns_active: 1,
    products_active: 3,
    qr_codes_issued_total: 8900,
    redemptions_open: 1,
    point_value_minor_units: 75,
    point_value_currency: "INR",
  },
  partners: [
    {
      id: "p-dec-201",
      display_name: "Santosh Patil (Kisan Partner)",
      phone_e164: "+919822012345",
      role: "farmer",
      verification_status: "verified",
      created_at: "2026-10-20T10:00:00Z",
    },
    {
      id: "p-dec-202",
      display_name: "Krishi Vikas Kendra Baramati",
      phone_e164: "+919822054321",
      role: "retailer",
      verification_status: "verified",
      created_at: "2026-10-21T11:30:00Z",
    },
    {
      id: "p-dec-203",
      display_name: "Marathwada Seeds Corporation",
      phone_e164: "+919822098765",
      role: "distributor",
      verification_status: "pending",
      created_at: "2026-10-23T08:45:00Z",
    },
    {
      id: "p-dec-204",
      display_name: "Anand Gite",
      phone_e164: "+919822033445",
      role: "farmer",
      verification_status: "pending",
      created_at: "2026-10-23T11:00:00Z",
    },
  ],
  products: [
    {
      id: "prod-dec-001",
      sku: "CANE-ROOT-10KG",
      name: "Sugarcane Root Growth Granules 10kg",
      pack_size: "10 kg",
      active: true,
    },
    {
      id: "prod-dec-002",
      sku: "COTTON-BOLL-500ML",
      name: "Cotton Boll Guard Bio-Shield 500ml",
      pack_size: "500 ml",
      active: true,
    },
    {
      id: "prod-dec-003",
      sku: "SOYA-INOC-250ML",
      name: "Soybean Rhizobium Inoculant 250ml",
      pack_size: "250 ml",
      active: true,
    },
  ],
  campaigns: [
    {
      id: "camp-dec-01",
      name: "Vidarbha & Marathwada Kharif Cash-Back",
      status: "active",
      starts_at: "2026-10-01T00:00:00Z",
      ends_at: "2026-12-31T23:59:59Z",
      budget_minor_units: 3500000,
      currency: "INR",
      rules: { demo: false },
    },
  ],
  batches: [
    {
      id: "batch-dec-9901",
      requested_count: 400,
      points_value: 75,
      status: "issued",
      packaging_level: "pallet",
      destination_state: "Maharashtra",
      retailer_margin_inr: 40,
    },
  ],
  redemptions: [
    {
      id: "red-dec-01",
      reward_name: "Drip Irrigation Filter Assembly",
      points_cost: 350,
      partner_name: "Santosh Patil",
      partner_phone: "+919822012345",
      status: "reserved",
      payout_status: "queued",
      payout_vpa: "patil@oksbi",
      payout_utr: null,
      reward_is_demo: false,
      created_at: "2026-10-23T10:15:00Z",
    },
  ],
  audit_logs: [
    {
      action: "qr_batch_issued",
      entity_type: "batch",
      entity_id: "batch-dec-9901",
      actor_user_id: "admin-deccan",
      reason: "Shipper pallet provisioned for Western Maharashtra",
      created_at: "2026-10-22T16:00:00Z",
    },
  ],
  pagination: {
    partners: { page: 0, page_size: 20, total: 4 },
    products: { page: 0, page_size: 20, total: 3 },
    campaigns: { page: 0, page_size: 20, total: 1 },
    batches: { page: 0, page_size: 20, total: 1 },
    redemptions: { page: 0, page_size: 20, total: 1 },
    audit: { page: 0, page_size: 20, total: 1 },
  },
  team: [
    {
      id: "tm-dec-01",
      email: "operations@deccancrop.com",
      display_name: "Western Zone Operations Lead",
      role: "brand_admin",
      status: "active",
      last_active: "2026-10-23T11:20:00Z",
    },
    {
      id: "tm-dec-02",
      email: "vigilance@deccancrop.com",
      display_name: "Field Development Officer",
      role: "field_executive",
      status: "active",
      last_active: "2026-10-23T09:40:00Z",
    },
  ],
  traceability: [
    {
      id: "tr-dec-001",
      batch_id: "batch-dec-9901",
      sku: "CANE-ROOT-10KG",
      stage: "warehouse_dispatched",
      stage_label: "Warehouse Dispatched",
      current_location: "Nagpur Central Logistics",
      allocated_state: "Maharashtra",
      packaging_level: "Master Pallet",
      transit_status: "En Route to Pune Hub",
      retailer_trade_status: "Pending Retail Arrival",
      anomaly: null,
      updated_at: "2026-10-23T09:00:00Z",
    },
  ],
  counterfeit_incidents: [
    {
      id: "inc-dec-01",
      district: "Solapur, Maharashtra",
      batch_id: "batch-dec-9901",
      sku: "COTTON-BOLL-500ML",
      severity: "medium",
      attempt_count: 3,
      time_span: "Yesterday afternoon",
      device_fingerprints: 2,
      ip_asns: ["AS55836 (Jio Infocomm)"],
      status: "active_investigation",
      recommended_action: "Audit Local Agro Kendra Inventory",
      created_at: "2026-10-22T17:00:00Z",
    },
  ],
  mes_api_keys: [
    {
      id: "key-dec-01",
      name: "Nagpur Seed Processing MES (Master Pallet Line)",
      key_prefix: "bg_live_mes_nag01_4c28",
      permissions: "batches:provision, cartons:aggregate, pallets:bind",
      created_at: "2026-10-01T10:00:00Z",
      last_used: "Yesterday (25 Pallets bound)",
      status: "active",
    },
  ],
};

const TENANT_DASHBOARDS = {
  "growta-rewardloop": MOCK_ADMIN_DASHBOARD,
  "punjab-kisan-agro": MOCK_PUNJAB_DASHBOARD,
  "deccan-crop-west": MOCK_DECCAN_DASHBOARD,
};

function getTenantDashboard(slug) {
  return TENANT_DASHBOARDS[slug] || MOCK_ADMIN_DASHBOARD;
}

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
                name: "BigAgri / Growta National Hub",
                role: "super_admin",
              },
              {
                id: "d0000000-0000-4000-8000-000000000002",
                slug: "punjab-kisan-agro",
                name: "Punjab Kisan Agro Bio-Tech",
                role: "brand_admin",
              },
              {
                id: "d0000000-0000-4000-8000-000000000003",
                slug: "deccan-crop-west",
                name: "Deccan Crop Protection Kendra",
                role: "brand_admin",
              },
            ],
          })
        );
        return;
      }

      if (bodyJson.action === "admin_dashboard") {
        const tenantSlug = bodyJson.tenant_slug || "growta-rewardloop";
        const dash = getTenantDashboard(tenantSlug);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify(dash));
        return;
      }

      if (bodyJson.action === "admin_audit_logs") {
        const tenantSlug = bodyJson.tenant_slug || "growta-rewardloop";
        const dash = getTenantDashboard(tenantSlug);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(
          JSON.stringify({
            ok: true,
            logs: dash.audit_logs || [],
            pagination: { page: 0, page_size: 20, total: (dash.audit_logs || []).length },
          })
        );
        return;
      }

      if (bodyJson.action === "admin_upi_payouts") {
        const tenantSlug = bodyJson.tenant_slug || "growta-rewardloop";
        const dash = getTenantDashboard(tenantSlug);
        const payouts = (dash.redemptions || []).map((r, i) => ({
          id: "pay-" + (r.id || i),
          redemption_id: r.id,
          partner_name: r.partner_name,
          partner_phone: r.partner_phone,
          upi_vpa: r.payout_vpa || "kisan@upi",
          amount_inr: (r.points_cost || 50) / 2,
          status: r.payout_status || "pending",
          utr_reference: r.payout_utr || null,
          created_at: r.created_at || new Date().toISOString(),
        }));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, payouts }));
        return;
      }

      if (bodyJson.action === "invite_operator") {
        const { email, role } = bodyJson;
        if (!email || !role) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ ok: false, error: "Email and role are required." }));
          return;
        }
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        dash.team.push({
          id: "tm-" + (dash.team.length + 1),
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
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        dash.team = dash.team.filter((t) => t.id !== operator_id);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "issue_qr_batch") {
        const { count, points_value, packaging_level, destination_state, retailer_margin_inr } = bodyJson;
        const dash = getTenantDashboard(bodyJson.tenant_slug);
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
        dash.batches.unshift({
          id: batchId,
          requested_count: n,
          points_value: points_value || 10,
          status: "issued",
          packaging_level: packaging_level || "unit",
          destination_state: destination_state || "All-India General",
          retailer_margin_inr: Number(retailer_margin_inr) || 0,
        });
        dash.metrics.qr_codes_issued_total = (dash.metrics.qr_codes_issued_total || 0) + n;
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, batch_id: batchId, codes }));
        return;
      }

      if (bodyJson.action === "redeem") {
        const { reward_id, request_key, upi_vpa } = bodyJson;
        const redemptionId = "red-" + crypto.randomUUID().slice(0, 8);
        const payoutId = "pay-" + crypto.randomUUID().slice(0, 8);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({
          ok: true,
          redemption_id: redemptionId,
          queued: true,
          payout_id: payoutId,
          payout_status: "pending",
          upi_vpa: upi_vpa || "kisan@upi",
          amount_inr: 50,
          utr: null,
          message: "UPI payout queued. Bank UTR reference will update upon clearance."
        }));
        return;
      }

      if (bodyJson.action === "upi_payout_status") {
        const { redemption_id, payout_id } = bodyJson;
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({
          ok: true,
          payout: {
            id: payout_id || "pay-mock",
            redemption_id: redemption_id || "red-mock",
            status: "pending",
            upi_vpa: "kisan@upi",
            amount_inr: 50,
            utr_reference: null,
            created_at: new Date().toISOString()
          }
        }));
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
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const name = String(bodyJson.name || "Factory Line Packaging Key");
        const permissions = String(bodyJson.permissions || "batches:provision, codes:mint");
        const newKey = {
          id: "key-0" + (dash.mes_api_keys.length + 1),
          name,
          key_prefix: "bg_live_mes_" + crypto.randomUUID().slice(0, 8),
          permissions,
          created_at: new Date().toISOString(),
          last_used: "Never",
          status: "active",
        };
        dash.mes_api_keys.unshift(newKey);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, key: newKey }));
        return;
      }

      if (bodyJson.action === "revoke_mes_key") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const keyId = bodyJson.key_id;
        dash.mes_api_keys = dash.mes_api_keys.filter(k => k.id !== keyId);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "resolve_counterfeit_incident") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const incidentId = bodyJson.incident_id;
        const inc = dash.counterfeit_incidents.find(i => i.id === incidentId);
        if (inc) {
          inc.status = "contained_blacklisted";
          inc.recommended_action = "Batch Locked & Blacklisted from Replay Claims";
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "create_product") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const newProd = {
          id: "prod-" + crypto.randomUUID().slice(0, 8),
          sku: String(bodyJson.sku || "").toUpperCase(),
          name: String(bodyJson.name || "New Product"),
          pack_size: String(bodyJson.pack_size || "1 Unit"),
          active: true,
        };
        dash.products.unshift(newProd);
        dash.metrics.products_active = dash.products.filter(p => p.active).length;
        dash.audit_logs.unshift({
          action: "product_created",
          entity_type: "product",
          entity_id: newProd.id,
          actor_user_id: "admin-system",
          reason: `Created product ${newProd.sku}`,
          created_at: new Date().toISOString()
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, product_id: newProd.id }));
        return;
      }

      if (bodyJson.action === "update_product") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const prod = dash.products.find(p => p.id === bodyJson.product_id);
        if (prod) {
          if (bodyJson.name) prod.name = String(bodyJson.name);
          if (bodyJson.pack_size !== undefined) prod.pack_size = String(bodyJson.pack_size);
          dash.audit_logs.unshift({
            action: "product_updated",
            entity_type: "product",
            entity_id: prod.id,
            actor_user_id: "admin-system",
            reason: `Updated product ${prod.sku}`,
            created_at: new Date().toISOString()
          });
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "set_product_status") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const prod = dash.products.find(p => p.id === bodyJson.product_id);
        if (prod) {
          prod.active = Boolean(bodyJson.active);
          dash.metrics.products_active = dash.products.filter(p => p.active).length;
          dash.audit_logs.unshift({
            action: prod.active ? "product_reactivated" : "product_deactivated",
            entity_type: "product",
            entity_id: prod.id,
            actor_user_id: "admin-system",
            reason: bodyJson.reason || "Status updated by admin",
            created_at: new Date().toISOString()
          });
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "create_campaign") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const newCamp = {
          id: "camp-" + crypto.randomUUID().slice(0, 8),
          name: String(bodyJson.name || "Seasonal Campaign"),
          status: "draft",
          starts_at: bodyJson.starts_at || null,
          ends_at: bodyJson.ends_at || null,
          budget_minor_units: Math.round(Number(bodyJson.budget || 0) * 100),
          currency: "INR",
          rules: { demo: false }
        };
        dash.campaigns.unshift(newCamp);
        dash.audit_logs.unshift({
          action: "campaign_created",
          entity_type: "campaign",
          entity_id: newCamp.id,
          actor_user_id: "admin-system",
          reason: `Created draft campaign ${newCamp.name}`,
          created_at: new Date().toISOString()
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, campaign_id: newCamp.id }));
        return;
      }

      if (bodyJson.action === "set_campaign_status") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const camp = dash.campaigns.find(c => c.id === bodyJson.campaign_id);
        if (camp) {
          camp.status = bodyJson.status;
          dash.metrics.campaigns_active = dash.campaigns.filter(c => c.status === "active").length;
          dash.audit_logs.unshift({
            action: "campaign_status_changed",
            entity_type: "campaign",
            entity_id: camp.id,
            actor_user_id: "admin-system",
            reason: `Campaign status changed to ${camp.status}`,
            created_at: new Date().toISOString()
          });
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "verify_partner") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const part = dash.partners.find(p => p.id === bodyJson.partner_id);
        if (part) {
          part.verification_status = bodyJson.status;
          dash.metrics.partners_pending = dash.partners.filter(p => ["pending", "unverified"].includes(p.verification_status)).length;
          dash.audit_logs.unshift({
            action: "partner_verified",
            entity_type: "partner",
            entity_id: part.id,
            actor_user_id: "admin-system",
            reason: `Partner status set to ${part.verification_status}`,
            created_at: new Date().toISOString()
          });
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "resolve_redemption") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const red = dash.redemptions.find(r => r.id === bodyJson.redemption_id);
        if (red) {
          red.status = bodyJson.status;
          dash.metrics.redemptions_open = dash.redemptions.filter(r => ["reserved", "approved"].includes(r.status)).length;
          dash.audit_logs.unshift({
            action: "redemption_resolved",
            entity_type: "redemption",
            entity_id: red.id,
            actor_user_id: "admin-system",
            reason: `Redemption marked ${red.status}`,
            created_at: new Date().toISOString()
          });
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "set_point_value") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        if (bodyJson.point_value_minor_units) {
          dash.metrics.point_value_minor_units = Number(bodyJson.point_value_minor_units);
        }
        if (bodyJson.point_value_currency) {
          dash.metrics.point_value_currency = bodyJson.point_value_currency;
        }
        dash.audit_logs.unshift({
          action: "point_value_updated",
          entity_type: "tenant",
          entity_id: dash.tenant.id,
          actor_user_id: "admin-system",
          reason: `Point valuation set to ${dash.metrics.point_value_minor_units} ${dash.metrics.point_value_currency}`,
          created_at: new Date().toISOString()
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (bodyJson.action === "revoke_qr_batch") {
        const dash = getTenantDashboard(bodyJson.tenant_slug);
        const b = dash.batches.find(x => x.id === bodyJson.batch_id);
        if (b) {
          b.status = "revoked";
          dash.audit_logs.unshift({
            action: "batch_revoked",
            entity_type: "batch",
            entity_id: b.id,
            actor_user_id: "admin-system",
            reason: "Batch revoked by admin",
            created_at: new Date().toISOString()
          });
        }
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
    headers["origin"] = "https://bigagri-pi.vercel.app";
    headers["referer"] = "https://bigagri-pi.vercel.app/";
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
