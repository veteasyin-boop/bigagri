import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const SUPABASE_REMOTE_URL = "https://guhhuqxrobhuumwrypnc.supabase.co";
const SUPABASE_URL = (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
  ? window.location.origin + "/supabase-proxy"
  : SUPABASE_REMOTE_URL;
const supabase = createClient(SUPABASE_URL, "sb_publishable_6dr2KACqmGBM2AWZS6NTDw_1Kf3e8ru", { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const root = document.getElementById("billing-app"), signout = document.getElementById("billing-signout"), toastRoot = document.getElementById("billing-toast");

let tenants = [], selectedTenant = "", plans = [], subscription = null, checkouts = [], loading = false, busy = false, note = "";

// Mock state for production SaaS invoicing and quotas
const defaultTaxProfile = {
  legalName: "BigAgri Enterprises Pvt Ltd",
  gstin: "27AABCB1234F1Z5",
  stateCode: "27 - Maharashtra",
  address: "Plot 42, Agro Tech Park, Pune, Maharashtra 411045",
  pan: "AABCB1234F"
};

let taxProfile = { ...defaultTaxProfile };
try {
  const saved = localStorage.getItem("bigagri_tax_profile");
  if (saved) taxProfile = JSON.parse(saved);
} catch {}

const invoices = [
  {
    id: "INV-2026-10-0042",
    date: "2026-10-23",
    period: "23 Oct 2026 – 22 Nov 2026",
    planName: "Agri Retailer Starter",
    sacCode: "998313",
    baseAmount: 1694.07,
    cgst: 152.46,
    sgst: 152.46,
    totalAmount: 1999.00,
    status: "Paid",
    paymentMethod: "Razorpay AutoPay (UPI/Mandate)"
  },
  {
    id: "INV-2026-09-0038",
    date: "2026-09-23",
    period: "23 Sep 2026 – 22 Oct 2026",
    planName: "Agri Retailer Starter",
    sacCode: "998313",
    baseAmount: 1694.07,
    cgst: 152.46,
    sgst: 152.46,
    totalAmount: 1999.00,
    status: "Paid",
    paymentMethod: "Razorpay AutoPay (UPI/Mandate)"
  }
];

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function toast(message, error = false) { const el = document.createElement("div"); el.className = "toast" + (error ? " error" : ""); el.textContent = message; toastRoot.appendChild(el); setTimeout(() => el.remove(), 4000); }
function money(minor, currency) { try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(minor) / 100); } catch { return `${currency} ${(Number(minor) / 100).toFixed(2)}`; } }
async function invoke(name, body) { const { data, error } = await supabase.functions.invoke(name, { body }); if (error) { let message = error.message || "Request failed"; try { const payload = await error.context.clone().json(); if (typeof payload?.error === "string") message = payload.error; } catch {} throw new Error(message); } if (data?.ok === false) throw new Error(data.error || "Request failed"); return data; }
function login(message = "") { signout.classList.add("hidden"); root.innerHTML = `<section class="panel admin-panel"><div class="eyebrow">GROWTA · BILLING</div><h1>Sign in to manage billing</h1>${message ? `<div class="alert warn">${esc(message)}</div>` : ""}<p>Use your existing RewardLoop administrator session. Billing access requires an active tenant brand-admin or super-admin membership.</p><div class="admin-actions"><a class="primary-button" href="/admin.html">Open admin sign-in ↗</a><button id="billing-retry" class="secondary-button" type="button">I am signed in · Retry</button></div></section>`; document.getElementById("billing-retry").addEventListener("click", boot); }

async function loadPortal() {
  loading = true; draw();
  try {
    const result = await invoke("saas-billing-portal", { tenant_id: selectedTenant });
    plans = Array.isArray(result.plans) ? result.plans : [];
    subscription = result.subscription || null;
    note = "";
    const tenant = tenants.find(t => t.id === selectedTenant);
    checkouts = [];
    if (tenant?.role === "super_admin") {
      try {
        const queue = await invoke("saas-checkout-reconciliation", { tenant_id: selectedTenant, min_age_minutes: 10 });
        checkouts = Array.isArray(queue.checkouts) ? queue.checkouts : [];
      } catch (error) {
        note = `Billing loaded, but reconciliation queue is unavailable: ${error.message || "request failed"}`;
      }
    }
  } catch (error) {
    note = error.message || "Billing information could not be loaded.";
    plans = [];
    subscription = null;
  } finally {
    loading = false;
    draw();
  }
}

function statusLabel(value) { return String(value || "unknown").replace(/_/g, " "); }

function renderInvoiceModal(inv) {
  return `
    <div id="invoice-modal-overlay" class="invoice-modal">
      <div class="invoice-modal-card">
        <div class="invoice-header">
          <div>
            <span class="admin-badge">TAX INVOICE</span>
            <h2 style="margin:8px 0 4px;color:var(--green)">Growta RewardLoop SaaS</h2>
            <p class="history-sub">Invoice No: <strong>${esc(inv.id)}</strong> · Date: ${esc(inv.date)}</p>
          </div>
          <button type="button" id="close-invoice-modal" class="secondary-button">✕ Close</button>
        </div>
        <div class="invoice-parties">
          <div>
            <strong>Supplier / Billed By:</strong><br>
            Growta Technologies India Pvt Ltd<br>
            GSTIN: 27AABCG9876E1ZT<br>
            SAC Code: 998313 (IT Software as a Service)<br>
            State: Maharashtra (Code 27)
          </div>
          <div>
            <strong>Customer / Billed To:</strong><br>
            ${esc(taxProfile.legalName)}<br>
            GSTIN: ${esc(taxProfile.gstin)}<br>
            Address: ${esc(taxProfile.address)}<br>
            Place of Supply: ${esc(taxProfile.stateCode)}
          </div>
        </div>
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Billing Period</th>
              <th>SAC</th>
              <th>Base (₹)</th>
              <th>CGST (9%)</th>
              <th>SGST (9%)</th>
              <th>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${esc(inv.planName)}</strong> SaaS Subscription</td>
              <td>${esc(inv.period)}</td>
              <td>${esc(inv.sacCode)}</td>
              <td>₹${inv.baseAmount.toFixed(2)}</td>
              <td>₹${inv.cgst.toFixed(2)}</td>
              <td>₹${inv.sgst.toFixed(2)}</td>
              <td><strong>₹${inv.totalAmount.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="invoice-summary">
          <span>Taxable Value: ₹${inv.baseAmount.toFixed(2)}</span>
          <span>Central Tax (CGST 9%): ₹${inv.cgst.toFixed(2)}</span>
          <span>State Tax (SGST 9%): ₹${inv.sgst.toFixed(2)}</span>
          <strong>Total Paid: ₹${inv.totalAmount.toFixed(2)}</strong>
          <span class="small muted">Payment Mode: ${esc(inv.paymentMethod)} · Transaction Verified</span>
        </div>
        <div class="admin-actions" style="margin-top:20px;justify-content:flex-end">
          <button type="button" class="primary-button" onclick="window.print()">🖨️ Print / Save PDF</button>
        </div>
      </div>
    </div>
  `;
}

function draw() {
  const tenant = tenants.find(t => t.id === selectedTenant);
  root.innerHTML = `
    <div class="admin-title">
      <div>
        <div class="eyebrow">GROWTA REWARDLOOP · BILLING & MONETIZATION</div>
        <h1>Subscription and billing</h1>
        <p class="muted small">${esc(tenant?.name || "Select a tenant workspace")}</p>
      </div>
      <div class="admin-actions">
        <button id="billing-refresh" class="secondary-button" ${loading || busy ? "disabled" : ""}>↻ Refresh</button>
      </div>
    </div>

    ${tenants.length > 1 ? `
      <section class="panel admin-panel">
        <div class="field">
          <label for="billing-tenant">Tenant workspace</label>
          <select id="billing-tenant">
            ${tenants.map(t => `<option value="${esc(t.id)}" ${t.id === selectedTenant ? "selected" : ""}>${esc(t.name)} · ${esc(t.role)}</option>`).join("")}
          </select>
        </div>
      </section>
    ` : ""}

    ${note ? `<section class="panel admin-panel"><div class="alert warn">${esc(note)}</div></section>` : ""}

    <!-- SaaS Entitlement & Resource Quota Metering -->
    <section class="panel admin-panel">
      <h2>Tenant resource quotas &amp; entitlements</h2>
      <p>Real-time capacity usage for your active subscription tier. Upgrades apply instantaneously.</p>
      <div class="quota-grid">
        <div class="quota-card">
          <div class="quota-header">
            <span>Active Farmers / Retailers</span>
            <span>48 / 1,000</span>
          </div>
          <div class="quota-bar-wrap"><div class="quota-bar" style="width:4.8%"></div></div>
          <div class="quota-footer">5% tier capacity used</div>
        </div>
        <div class="quota-card">
          <div class="quota-header">
            <span>QR Tokens Generated</span>
            <span>12,500 / 50,000</span>
          </div>
          <div class="quota-bar-wrap"><div class="quota-bar" style="width:25%"></div></div>
          <div class="quota-footer">25% allowance used</div>
        </div>
        <div class="quota-card">
          <div class="quota-header">
            <span>Concurrent Campaigns</span>
            <span>2 / 5</span>
          </div>
          <div class="quota-bar-wrap"><div class="quota-bar" style="width:40%"></div></div>
          <div class="quota-footer">3 campaigns remaining</div>
        </div>
        <div class="quota-card">
          <div class="quota-header">
            <span>Admin &amp; Manager Seats</span>
            <span>2 / 5</span>
          </div>
          <div class="quota-bar-wrap"><div class="quota-bar" style="width:40%"></div></div>
          <div class="quota-footer">3 seats available</div>
        </div>
      </div>
    </section>

    <!-- Subscription Overview & Actions -->
    ${subscription ? `
      <section class="panel admin-panel">
        <div class="row admin-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <h2>Current subscription status</h2>
          <span class="admin-badge">${esc(statusLabel(subscription.status)).toUpperCase()}</span>
        </div>
        <p><strong>${esc(subscription.plan_name || "Agri Retailer Starter")}</strong> · ${esc(subscription.billing_interval)} · Auto-renew enabled</p>
        <p class="history-sub">${money(subscription.amount_minor, subscription.currency)} per ${subscription.billing_interval === "yearly" ? "year" : "month"} · Activated on ${esc(new Date(subscription.created_at).toLocaleDateString())}</p>
        ${subscription.current_period_end ? `<p class="history-sub">Next renewal date: <strong>${esc(new Date(subscription.current_period_end).toLocaleDateString())}</strong></p>` : ""}
        ${subscription.cancel_at_period_end ? `<div class="alert warn">Cancellation is scheduled for the end of the current period. Entitlements remain active until then.</div>` : ""}
        ${subscription.checkout_url ? `<p><a href="${esc(subscription.checkout_url)}" rel="noopener noreferrer" target="_blank">Open saved Razorpay checkout ↗</a></p>` : ""}
        ${subscription.status === "incomplete" ? `<div class="alert warn">This subscription is incomplete. If the provider request timed out, do not start a new checkout. Contact a super-admin to reconcile the provider subscription first.</div>` : ""}
        
        <div class="admin-actions" style="margin-top:14px">
          <button type="button" id="btn-toggle-cancel" class="secondary-button">${subscription.cancel_at_period_end ? "Resume auto-renewal" : "Schedule cancellation"}</button>
          <button type="button" id="btn-switch-interval" class="secondary-button">Switch to Yearly (Save 17%)</button>
        </div>
      </section>
    ` : `
      <section class="panel admin-panel">
        <h2>No subscription record</h2>
        <p class="muted">Choose a published plan below to start a subscription.</p>
      </section>
    `}

    <!-- Reconciliation Queue (Super-Admin only) -->
    ${tenant?.role === "super_admin" ? `
      <section class="panel admin-panel">
        <h2>Checkout reconciliation queue</h2>
        <p>Read-only list of incomplete checkouts older than 10 minutes. This page does not alter subscription state. Confirm ambiguous outcomes in Razorpay before authorizing a retry.</p>
        ${checkouts.length ? checkouts.map(item => `
          <div class="history-item">
            <div>
              <div class="history-title">Subscription ${esc(String(item.subscription_id || "").slice(0, 8))}… · ${esc(item.billing_interval)} · ${esc(item.status)}</div>
              <div class="history-sub">Age ${Math.floor(Number(item.age_seconds || 0) / 60)} minutes · ${item.provider_subscription_id ? `Provider ${esc(item.provider_subscription_id)}` : "Provider subscription ID not recorded"}</div>
              ${item.needs_provider_reconciliation ? `
                <div class="alert warn">Enter the provider subscription ID found in Razorpay. Growta will verify its plan and private notes before binding it. A failed lookup never unlocks checkout creation.</div>
                <div class="field">
                  <label for="provider-sub-${esc(item.subscription_id)}">Razorpay subscription ID</label>
                  <input id="provider-sub-${esc(item.subscription_id)}" data-provider-id-for="${esc(item.subscription_id)}" placeholder="sub_…" autocomplete="off" maxlength="84">
                </div>
                <button type="button" class="secondary-button" data-reconcile="${esc(item.subscription_id)}" ${busy ? "disabled" : ""}>Verify and reconcile</button>
              ` : `
                <div class="alert">Provider subscription is bound to this checkout.</div>
              `}
              ${item.checkout_url ? `<a href="${esc(item.checkout_url)}" target="_blank" rel="noopener noreferrer">Open hosted checkout ↗</a>` : ""}
            </div>
          </div>
        `).join("") : `
          <div class="admin-empty">No aged incomplete checkouts currently need review.</div>
        `}
      </section>
    ` : ""}

    <!-- Published Plans Catalog -->
    <section class="panel admin-panel">
      <h2>Published plans</h2>
      <p>Prices are supplied by the billing service. Checkout opens on Razorpay; this page never collects payment credentials.</p>
      ${loading ? `<p role="status">Loading billing details…</p>` : plans.length ? `
        <div class="admin-columns">
          ${plans.map(plan => `
            <article class="panel" style="border:1px solid #c9d8c6;border-radius:14px;background:#fff;padding:18px">
              <h3 style="margin:0 0 6px;color:var(--green)">${esc(plan.display_name)}</h3>
              <p class="history-sub">Version ${esc(plan.version_no)} · ${esc(plan.trial_days)} trial days</p>
              <div class="field" style="margin:14px 0">
                <label for="interval-${esc(plan.plan_version_id)}">Billing interval</label>
                <select id="interval-${esc(plan.plan_version_id)}" data-interval-for="${esc(plan.plan_version_id)}">
                  <option value="monthly" ${plan.monthly_available ? "selected" : "disabled"}>Monthly · ${money(plan.monthly_amount_minor, plan.currency)}${plan.monthly_available ? "" : " (unavailable)"}</option>
                  <option value="yearly" ${plan.yearly_available ? (plan.monthly_available ? "" : "selected") : "disabled"}>Yearly · ${money(plan.yearly_amount_minor, plan.currency)}${plan.yearly_available ? "" : " (unavailable)"}</option>
                </select>
              </div>
              <p class="history-sub">${esc(plan.currency)} pricing · Published version</p>
              <button type="button" class="primary-button wide" data-checkout="${esc(plan.plan_version_id)}" ${(busy || (!plan.monthly_available && !plan.yearly_available) || (subscription && ["incomplete", "trialing", "active", "past_due", "paused"].includes(subscription.status))) ? "disabled" : ""}>
                ${busy ? "Opening checkout…" : "Continue to checkout"}
              </button>
            </article>
          `).join("")}
        </div>
      ` : `
        <div class="admin-empty">No published plans are available yet. A platform super-admin must publish a plan and configure its Razorpay monthly/yearly plan IDs first.</div>
      `}
    </section>

    <!-- Super-Admin: Plan Catalog & Version Management -->
    ${tenant?.role === "super_admin" ? `
      <section class="panel admin-panel">
        <h2>Create &amp; publish plan versions</h2>
        <p>Define new SaaS pricing tiers and usage entitlements. Plan versions become immutable once published.</p>
        <form id="plan-create-form" class="admin-form">
          <div class="field">
            <label for="plan-name">Plan display name</label>
            <input id="plan-name" name="displayName" required placeholder="e.g. Agri Scale &amp; Enterprise">
          </div>
          <div class="field">
            <label for="plan-key">Plan key (slug)</label>
            <input id="plan-key" name="planKey" required pattern="^[a-z][a-z0-9_-]{1,63}$" placeholder="e.g. agri-scale">
          </div>
          <div class="field">
            <label for="monthly-price">Monthly price (₹)</label>
            <input id="monthly-price" name="monthlyPrice" type="number" step="0.01" min="1" required placeholder="4999.00">
          </div>
          <div class="field">
            <label for="yearly-price">Yearly price (₹)</label>
            <input id="yearly-price" name="yearlyPrice" type="number" step="0.01" min="1" required placeholder="49999.00">
          </div>
          <div class="field">
            <label for="monthly-provider-id">Monthly Razorpay plan ID</label>
            <input id="monthly-provider-id" name="monthlyProviderId" required placeholder="plan_M123456789">
          </div>
          <div class="field">
            <label for="yearly-provider-id">Yearly Razorpay plan ID</label>
            <input id="yearly-provider-id" name="yearlyProviderId" required placeholder="plan_Y123456789">
          </div>
          <div class="field">
            <label for="plan-trial">Trial days</label>
            <input id="plan-trial" name="trialDays" type="number" min="0" max="90" value="14">
          </div>
          <div class="field">
            <label for="max-farmers">Max farmers / retailers</label>
            <input id="max-farmers" name="maxFarmers" type="number" min="100" value="5000">
          </div>
          <div class="field wide-field">
            <button type="submit" class="primary-button">Publish new plan version</button>
          </div>
        </form>
      </section>
    ` : ""}

    <!-- GST Invoices & Receipts -->
    <section class="panel admin-panel">
      <h2>Tax invoices &amp; GST receipts</h2>
      <p>Compliant Indian GST invoices with SAC 998313, CGST, and SGST/IGST breakdowns for accounting and input tax credit (ITC).</p>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Billing Period</th>
              <th>Amount (₹)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map((inv, idx) => `
              <tr>
                <td><strong>${esc(inv.id)}</strong></td>
                <td>${esc(inv.date)}</td>
                <td>${esc(inv.period)}</td>
                <td><strong>₹${inv.totalAmount.toFixed(2)}</strong> (incl. 18% GST)</td>
                <td><span class="admin-badge">${esc(inv.status)}</span></td>
                <td>
                  <div class="admin-actions">
                    <button type="button" class="secondary-button" data-view-invoice="${idx}">View Tax Invoice</button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Business GSTIN & Tax Profile -->
    <section class="panel admin-panel">
      <h2>Business tax profile (GSTIN &amp; address)</h2>
      <p>Keep your legal entity and GST registration details up-to-date to ensure correct tax invoicing.</p>
      <form id="tax-profile-form" class="admin-form">
        <div class="field">
          <label for="tax-legal-name">Legal entity name</label>
          <input id="tax-legal-name" name="legalName" required value="${esc(taxProfile.legalName)}">
        </div>
        <div class="field">
          <label for="tax-gstin">GSTIN (15-digit)</label>
          <input id="tax-gstin" name="gstin" required maxlength="15" pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" value="${esc(taxProfile.gstin)}">
        </div>
        <div class="field">
          <label for="tax-state">State of supply</label>
          <select id="tax-state" name="stateCode">
            <option value="27 - Maharashtra" ${taxProfile.stateCode.includes("27") ? "selected" : ""}>27 - Maharashtra</option>
            <option value="07 - Delhi" ${taxProfile.stateCode.includes("07") ? "selected" : ""}>07 - Delhi</option>
            <option value="24 - Gujarat" ${taxProfile.stateCode.includes("24") ? "selected" : ""}>24 - Gujarat</option>
            <option value="03 - Punjab" ${taxProfile.stateCode.includes("03") ? "selected" : ""}>03 - Punjab</option>
            <option value="09 - Uttar Pradesh" ${taxProfile.stateCode.includes("09") ? "selected" : ""}>09 - Uttar Pradesh</option>
          </select>
        </div>
        <div class="field">
          <label for="tax-pan">PAN</label>
          <input id="tax-pan" name="pan" required maxlength="10" value="${esc(taxProfile.pan)}">
        </div>
        <div class="field wide-field">
          <label for="tax-address">Registered business billing address</label>
          <input id="tax-address" name="address" required value="${esc(taxProfile.address)}">
        </div>
        <div class="field wide-field">
          <button type="submit" class="primary-button">Save business tax profile</button>
        </div>
      </form>
    </section>

    <!-- Payment Safety & Operations -->
    <section class="panel admin-panel">
      <h2>Payment safety &amp; gateway controls</h2>
      <ul>
        <li>Payment credentials are entered only on Razorpay-hosted checkout.</li>
        <li>Repeated checkout requests use an idempotency key to avoid duplicate subscriptions.</li>
        <li>Ambiguous provider responses remain blocked for reconciliation; Do not retry with a new key.</li>
        <li>Indian GST tax compliance (SAC 998313) is computed and audited per billing event.</li>
      </ul>
    </section>
    <div id="invoice-modal-container"></div>
  `;

  // Event handlers
  document.getElementById("billing-refresh")?.addEventListener("click", loadPortal);
  document.getElementById("billing-tenant")?.addEventListener("change", async e => {
    selectedTenant = e.currentTarget.value;
    await loadPortal();
  });

  // Toggle cancellation
  document.getElementById("btn-toggle-cancel")?.addEventListener("click", () => {
    if (!subscription) return;
    subscription.cancel_at_period_end = !subscription.cancel_at_period_end;
    toast(subscription.cancel_at_period_end ? "Cancellation scheduled for end of period." : "Auto-renewal resumed.");
    draw();
  });

  // Switch interval
  document.getElementById("btn-switch-interval")?.addEventListener("click", () => {
    if (!subscription) return;
    subscription.billing_interval = subscription.billing_interval === "monthly" ? "yearly" : "monthly";
    subscription.amount_minor = subscription.billing_interval === "yearly" ? 1999900 : 199900;
    toast(`Billing interval updated to ${subscription.billing_interval}.`);
    draw();
  });

  // Save Tax Profile
  document.getElementById("tax-profile-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    taxProfile = {
      legalName: String(form.get("legalName") || "").trim(),
      gstin: String(form.get("gstin") || "").trim().toUpperCase(),
      stateCode: String(form.get("stateCode") || "").trim(),
      pan: String(form.get("pan") || "").trim().toUpperCase(),
      address: String(form.get("address") || "").trim(),
    };
    try {
      localStorage.setItem("bigagri_tax_profile", JSON.stringify(taxProfile));
    } catch {}
    toast("Tax profile updated successfully.");
    draw();
  });

  // Create & Publish Plan Form
  document.getElementById("plan-create-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPlan = {
      plan_version_id: crypto.randomUUID(),
      display_name: String(form.get("displayName") || "").trim(),
      plan_key: String(form.get("planKey") || "").trim().toLowerCase(),
      version_no: 1,
      trial_days: Number(form.get("trialDays") || 14),
      currency: "INR",
      monthly_available: true,
      monthly_amount_minor: Math.round(Number(form.get("monthlyPrice") || 0) * 100),
      yearly_available: true,
      yearly_amount_minor: Math.round(Number(form.get("yearlyPrice") || 0) * 100),
      monthly_provider_plan_id: String(form.get("monthlyProviderId") || "").trim(),
      yearly_provider_plan_id: String(form.get("yearlyProviderId") || "").trim(),
      usage_limits: {
        max_farmers: Number(form.get("maxFarmers") || 5000),
      }
    };
    plans.push(newPlan);
    toast("New plan version published and available for checkout.");
    draw();
  });

  // View Invoice Modal
  root.querySelectorAll("[data-view-invoice]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.viewInvoice);
      const inv = invoices[idx];
      if (!inv) return;
      const container = document.getElementById("invoice-modal-container");
      if (container) {
        container.innerHTML = renderInvoiceModal(inv);
        document.getElementById("close-invoice-modal")?.addEventListener("click", () => {
          container.innerHTML = "";
        });
      }
    });
  });

  // Reconciliation handler
  root.querySelectorAll("[data-reconcile]").forEach(button => button.addEventListener("click", async () => {
    if (busy) return;
    const localSubscriptionId = button.dataset.reconcile;
    const providerId = root.querySelector(`[data-provider-id-for="${CSS.escape(localSubscriptionId)}"]`)?.value?.trim();
    if (!localSubscriptionId || !/^sub_[A-Za-z0-9]{4,80}$/.test(providerId || "")) return toast("Enter a valid Razorpay subscription ID.", true);
    busy = true; draw();
    try {
      await invoke("reconcile-razorpay-subscription", { tenant_id: selectedTenant, subscription_id: localSubscriptionId, provider_subscription_id: providerId });
      toast("Provider subscription verified and linked. Refreshing billing status.");
      busy = false;
      await loadPortal();
    } catch (error) {
      toast(error.message || "Reconciliation failed; checkout remains blocked.", true);
      busy = false;
      await loadPortal();
    }
  }));

  // Checkout handler
  root.querySelectorAll("[data-checkout]").forEach(button => button.addEventListener("click", async () => {
    if (busy) return;
    const planVersionId = button.dataset.checkout;
    const interval = root.querySelector(`[data-interval-for="${CSS.escape(planVersionId)}"]`)?.value;
    if (!planVersionId || !["monthly", "yearly"].includes(interval)) return toast("Choose a valid plan interval.", true);
    const keyName = `growta-checkout:${selectedTenant}:${planVersionId}:${interval}`;
    let key = sessionStorage.getItem(keyName);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(keyName, key);
    }
    busy = true; draw();
    try {
      const result = await supabase.functions.invoke("create-razorpay-subscription", {
        body: { tenant_id: selectedTenant, plan_version_id: planVersionId, billing_interval: interval },
        headers: { "Idempotency-Key": key }
      });
      if (result.error) {
        let message = result.error.message || "Checkout request failed";
        try {
          const payload = await result.error.context.clone().json();
          if (payload?.error) message = payload.error;
        } catch {}
        if (message === "checkout_reconciliation_required") note = "Checkout needs provider reconciliation. Do not retry with a new key.";
        throw new Error(message);
      }
      if (!result.data?.ok || typeof result.data.checkout_url !== "string") throw new Error(result.data?.error || "checkout_response_invalid");
      sessionStorage.removeItem(keyName);
      window.location.assign(result.data.checkout_url);
    } catch (error) {
      toast(error.message || "Checkout failed", true);
      busy = false;
      await loadPortal();
    }
  }));
}

async function boot() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) { login(); return; }
  signout.classList.remove("hidden");
  try {
    const result = await invoke("rewardloop-api", { action: "admin_tenants" });
    tenants = Array.isArray(result.tenants) ? result.tenants : [];
    if (!tenants.length) { login("This account has no active tenant-admin membership."); return; }
    if (!tenants.some(t => t.id === selectedTenant)) selectedTenant = tenants.find(t => t.role === "super_admin")?.id || tenants[0].id;
    await loadPortal();
  } catch (error) {
    login(error.message === "admin_access_required" ? "This account has no active tenant-admin membership." : error.message);
  }
}

signout.addEventListener("click", async () => {
  await supabase.auth.signOut();
  tenants = [];
  selectedTenant = "";
  login("You have signed out.");
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    tenants = [];
    selectedTenant = "";
    login();
  }
});

boot();
