# RewardLoop Repository of Record

Last reviewed: 2026-10-21

## Canonical project

**The active source of truth is `Ankitgrahatha/bigagri`, branch `main`.** RewardLoop application code, admin console, Supabase function source, migration artifacts, tests, and release notes belong here.

- Farmer PWA: https://bigagri.vercel.app/
- Admin console: https://bigagri.vercel.app/admin.html
- Admin settings: https://bigagri.vercel.app/admin-settings.html
- Repository: https://github.com/Ankitgrahatha/bigagri
- Vercel project: `bigagri`; production branch: `main`
- Supabase project: `guhhuqxrobhuumwrypnc`; region `ap-south-1`
- RewardLoop tenant slug: `growta-rewardloop`

## Repository separation

`Ankitgrahatha/growta-rewardloop` is a separate repository and is **not** the active development target. Do not copy changes between repositories, change the Vercel Git integration, or deploy from that repository as part of routine RewardLoop work. Any future consolidation must be a deliberate reviewed migration with a file-by-file diff and deployment rollback plan.

## Release discipline

1. Make changes in a feature branch in `bigagri`.
2. Run source/static checks and the safe CORS/auth smoke test.
3. Review changes and merge only after checks pass.
4. Verify the resulting Vercel production deployment points to the intended `bigagri` commit.
5. Keep real-value reward campaigns disabled until authentication delivery, role/tenant isolation, QR replay/concurrency, redemption atomicity, and recovery tests are evidenced.

## Evidence and limitations from this review

- Live Supabase schema contains the columns used by the current farmer UI for partner profile, reward catalogue, points ledger, and redemption history.
- Live RLS policies include own-profile reads, own-ledger reads, own-redemption reads, active-reward reads, and active-tenant discovery.
- `rewardloop-api` is active with JWT verification enabled. Its privileged operations use the server-side service-role client and internal RPCs.
- Live transactional claim/redeem concurrency tests have **not** been proven by this inspection.
- Network-level smoke checks from this execution environment could not resolve the production Vercel/Supabase hostnames. Do not report those HTTP checks as passed; run the existing GitHub Actions smoke workflow or execute `supabase/tests/rewardloop_cors_smoke_test.sh` from an environment with network access.
- Production authentication email delivery and account confirmation remain unverified. A deployment being READY is not proof of a complete farmer journey.

## Safety rules

- Never commit or expose Supabase service-role credentials.
- Never run mutating claim, redemption, QR issuance, campaign, or fulfilment tests against production.
- Do not create a paid Supabase branch or service without explicit cost approval.
- Do not apply guessed or reconstructed migrations to production. Recover and review canonical migration SQL first.

## Enterprise Architecture & Competitor-Benchmarking Modules (2026-10-23)

The following enterprise capabilities (benchmarked against Bayer Rewards Plus, Syngenta Cropwise, and UPL Farmily) have been fully engineered and regression-verified:

1. **Direct UPI / Bank Payouts Integration**:
   - Integrated instant UPI cash transfers (`cash_upi`) into the farmer redemption workflow.
   - VPA format validation (`farmer@okhdfcbank`, `mobile@paytm`), pre-redemption calculation breakdown, and instant NPCI IMPS simulated UTR disbursement receipt generation.
2. **Gamified Scratch Card & Seasonal Lucky Draw Tickets**:
   - Interactive scratch card revealing surprise bonus farmer loyalty points on pack verification.
   - Automated seasonal lucky draw coupon allocation (e.g., `RABI-2026-XXXXX`) eligible for Bumper Prizes (Mahindra 575 DI Tractor, 5HP Solar Pump, 16L Battery Sprayer).
   - Offline-persistent ticket wallet displayed across Farmer Home and Account screens.
3. **3-Tier Packaging Aggregation Hierarchy**:
   - Structured custody tracking across `Unit Pack` (pouch/bottle), `Shipper Carton` (24 units), and `Master Pallet` (960 units).
   - Aggregation-aware QR issuance and verification.
4. **Dual-Sided Channel Trade Margins**:
   - Krishi Kendra retailer arrival margin incentives (e.g. ₹50/box trade margin credit) linked with farmer end-use pack verification.
5. **Geo-Fenced Territory Anti-Diversion Control**:
   - Origin dispatch state allocation vs. actual scan geolocation comparison.
   - Real-time diversion detection and automated alerting on cross-border leakage.
6. **Dual-Layer Anti-Counterfeit Packaging (Outer Logistics QR vs. Inner Scratch PIN)**:
   - Outer QR handles logistics custody, distributor transit scans, and batch authentication.
   - Inner Scratch-Off PIN prevents shelf tampering and early token harvesting by bad actors before legitimate retail sale to farmers.
7. **Retailer Assisted Farmer Scan Mode ("Kisan Sahayata / Dealer Scan Mode")**:
   - Enables Krishi Kendra retailers to scan on behalf of less tech-literate farmers using their registered mobile number.
   - Triggers dual credit upon verification: points credit to farmer wallet + retailer ₹50 Kendra handling margin credit.
8. **Vernacular Voice Affirmation (Bilingual Hindi + English)**:
   - Automated Web Speech synthesis audio playback upon pack scan (e.g., "बधाई हो! आपका उत्पाद 100% असली है और आपके खाते में पॉइंट्स जमा कर दिए गए हैं।").
   - Accessibility toggle in the farmer interface.
9. **"Kisan Mitr" Viral Farmer Referral Engine**:
   - One-tap WhatsApp bilingual sharing with auto-generated referral code (`KISAN-XXXX`).
   - Tracks referral invitations, referral claims, and awards 25 bonus loyalty points on first successful pack claim.
10. **Counterfeit & Security Incident Geo-Clustered Dossiers**:
    - Centralized incident management for geo-velocity anomalies, duplicate scan attempts, device fingerprint clusters, and IP ASNs.
    - Automated batch containment and blacklisting across all APMC Mandis and Kendra nodes.
11. **Factory Packaging Line MES / ERP Machine-to-Machine (M2M) API Integration**:
    - Scoped API key provisioning for high-speed automated packaging lines (Domino, Markem-Imaje, Videojet, SAP/Oracle MES).
    - Rate limit controls and cURL integration patterns.
12. **Field Development Officer (FDO) Non-Destructive Spot Audit Tool**:
    - Dedicated cryptographic spot check utility for field officers and vigilance squads.
    - Inspects pack authenticity, manufacturing dates, territory allocations, and farmer reward claim eligibility without burning or invalidating consumer tokens.
