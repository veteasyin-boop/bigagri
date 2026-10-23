import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const SUPABASE_REMOTE_URL = "https://guhhuqxrobhuumwrypnc.supabase.co";
const SUPABASE_URL = (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
  ? window.location.origin + "/supabase-proxy"
  : SUPABASE_REMOTE_URL;
const supabase = createClient(SUPABASE_URL, "sb_publishable_6dr2KACqmGBM2AWZS6NTDw_1Kf3e8ru", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const toastRoot = document.getElementById("brand-toast");
function toast(message, isError = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = message;
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// Auto-slugify company name
const companyInput = document.getElementById("company-name");
const slugInput = document.getElementById("tenant-slug");
let slugManuallyEdited = false;

slugInput?.addEventListener("input", () => {
  slugManuallyEdited = Boolean(slugInput.value.trim());
});

companyInput?.addEventListener("input", () => {
  if (slugManuallyEdited) return;
  const raw = companyInput.value.trim().toLowerCase();
  const slug = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (slugInput) slugInput.value = slug;
});

// Form submission handler
const form = document.getElementById("brand-register-form");
const statusAlert = document.getElementById("register-status");
const submitBtn = document.getElementById("btn-provision");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const companyName = String(data.get("companyName") || "").trim();
  const tenantSlug = String(data.get("tenantSlug") || "").trim().toLowerCase();
  const gstin = String(data.get("gstin") || "").trim().toUpperCase();
  const adminName = String(data.get("adminName") || "").trim();
  const adminEmail = String(data.get("adminEmail") || "").trim().toLowerCase();
  const adminPassword = String(data.get("adminPassword") || "");
  const selectedPlan = String(data.get("plan") || "starter");

  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(tenantSlug)) {
    toast("Please enter a valid subdomain/slug (lowercase letters, numbers, and hyphens).", true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Provisioning brand workspace…";
  if (statusAlert) {
    statusAlert.style.display = "block";
    statusAlert.className = "alert";
    statusAlert.textContent = `Configuring isolated workspace for ${companyName} (${tenantSlug})…`;
  }

  try {
    // 1. Register brand in local storage / mock state
    const tenantRecord = {
      id: crypto.randomUUID(),
      name: companyName,
      slug: tenantSlug,
      gstin: gstin,
      plan: selectedPlan,
      adminName: adminName,
      adminEmail: adminEmail,
      createdAt: new Date().toISOString()
    };

    const existingTenants = JSON.parse(localStorage.getItem("bigagri_registered_tenants") || "[]");
    existingTenants.push(tenantRecord);
    localStorage.setItem("bigagri_registered_tenants", JSON.stringify(existingTenants));

    // 2. Set active tenant context
    localStorage.setItem("bigagri_active_tenant", JSON.stringify(tenantRecord));

    // 3. Authenticate admin
    await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    }).catch(() => {});

    toast(`Workspace created successfully for ${companyName}!`);

    setTimeout(() => {
      window.location.assign(`/admin.html?tenant=${encodeURIComponent(tenantSlug)}&onboarded=true`);
    }, 1200);

  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Provision isolated brand workspace";
    if (statusAlert) {
      statusAlert.className = "alert warn";
      statusAlert.textContent = err.message || "Failed to provision workspace. Please try again.";
    }
    toast("Registration failed: " + err.message, true);
  }
});
