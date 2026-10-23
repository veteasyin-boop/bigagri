# Growta RewardLoop — Infrastructure Baseline Guide (Module 0)

This guide documents the immediate operational steps required to transition Growta RewardLoop from prototype to enterprise-grade production reliability.

---

## 1. Production SMTP Configuration (Supabase Auth)

The built-in Supabase email service is strictly rate-limited (3-4 emails/hour) and sends from `noreply@mail.app.supabase.io`, which frequently lands in spam or triggers `over_email_send_rate_limit` errors.

### Recommended Provider: Resend (Best for India & Global Delivery)

1. Sign up at [Resend.com](https://resend.com) (free tier includes 3,000 emails/month).
2. Add and verify your sending domain (e.g., `growta.in` or `bigagri.in`):
   - **SPF:** `v=spf1 include:resend.com ~all`
   - **DKIM:** Generated TXT record provided by Resend
   - **DMARC:** `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
3. Generate an API Key in Resend.
4. Navigate to **Supabase Dashboard** → Project `guhhuqxrobhuumwrypnc` → **Authentication** → **SMTP Settings**:
   - **Enable Custom SMTP:** `ON`
   - **Sender email:** `noreply@growta.in` (or your verified domain email)
   - **Sender name:** `Growta RewardLoop`
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (TLS)
   - **Username:** `resend`
   - **Password:** `<Your Resend API Key>`
5. Test signup or password reset at `https://bigagri-pi.vercel.app/` and verify deliverability.

---

## 2. Supabase Edge Function Secrets

In **Supabase Dashboard** → **Edge Functions** → **Secrets**, ensure the following environment variables are set:

| Secret Name | Value Description | Example / Default |
|---|---|---|
| `ALLOWED_ORIGINS` | Comma-separated list of browser origins permitted by CORS | `https://bigagri.vercel.app,https://bigagri-pi.vercel.app` |
| `SENTRY_DSN` | Sentry Edge/Deno project DSN for unhandled exception capture | `https://xxxx@o123456.ingest.sentry.io/7890` |
| `RAZORPAY_KEY_ID` | Razorpay API key ID for subscriptions/payouts | `rzp_test_xxxx` (test mode initially) |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret key | `<secret>` |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured in Razorpay Webhook dashboard | `<webhook-secret>` |
| `RAZORPAY_PROCESSOR_SECRET` | Secret authorizing background webhook batch processing | `<random-32-char-token>` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (optional burst rate-limiting) | `https://ap1-xxxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Bearer token | `<token>` |

---

## 3. GitHub Actions CI/CD Deployment

The repository now includes `.github/workflows/deploy-edge-functions.yml`:
- Trigger: Push to `main` on path `supabase/functions/**` or manual `workflow_dispatch`.
- Prerequisite: Add `SUPABASE_ACCESS_TOKEN` in **GitHub Repository Settings** → **Secrets and variables** → **Actions**.
- Deploys all Edge Functions automatically to Supabase project `guhhuqxrobhuumwrypnc`.

---

## 4. Production Uptime & Synthetic Monitoring

Configure free external heartbeat monitoring using [Better Uptime](https://betteruptime.com) or [Freshping](https://freshworks.com/freshping):

1. **Frontend PWA Monitor:**
   - URL: `https://bigagri-pi.vercel.app/`
   - Method: `GET`
   - Cadence: Every 1 minute
   - Expected status: `200`
2. **Edge Function Health Monitor:**
   - URL: `https://guhhuqxrobhuumwrypnc.supabase.co/functions/v1/rewardloop-api`
   - Method: `OPTIONS`
   - Cadence: Every 5 minutes
   - Expected status: `204` or `200`
3. **Alert Routing:**
   - Connect alerts to ops email (`alerts@growta.in`) or a dedicated Telegram/Slack channel.
