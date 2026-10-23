-- Migration: 20261024200000_upi_payout_queue.sql
-- Module 3: Real UPI Payout Pipeline queue table, constraints, and RLS policies

CREATE TABLE IF NOT EXISTS public.upi_payout_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  redemption_id uuid NOT NULL REFERENCES public.redemptions(id) ON DELETE RESTRICT UNIQUE,
  upi_vpa text NOT NULL CHECK (length(trim(upi_vpa)) >= 3 AND length(upi_vpa) <= 256),
  amount_inr numeric(10,2) NOT NULL CHECK (amount_inr > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'reversed')),
  razorpay_payout_id text,
  utr_reference text,
  failure_reason text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_upi_payout_queue_tenant_partner
  ON public.upi_payout_queue (tenant_id, partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_upi_payout_queue_status_created
  ON public.upi_payout_queue (status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_upi_payout_queue_redemption
  ON public.upi_payout_queue (redemption_id);

-- Enable Row Level Security
ALTER TABLE public.upi_payout_queue ENABLE ROW LEVEL SECURITY;

-- Restrict base table privileges
REVOKE ALL PRIVILEGES ON TABLE public.upi_payout_queue FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.upi_payout_queue TO service_role;
GRANT SELECT ON TABLE public.upi_payout_queue TO authenticated;

-- Policy 1: Authenticated farmers/partners can read only their own payouts
CREATE POLICY "partner_reads_own_payouts"
  ON public.upi_payout_queue
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT p.id FROM public.partners p
      WHERE p.user_id = auth.uid()
        AND p.tenant_id = upi_payout_queue.tenant_id
    )
  );

-- Policy 2: Brand and super admins can view payouts for their active tenant
CREATE POLICY "admin_reads_tenant_payouts"
  ON public.upi_payout_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = upi_payout_queue.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('brand_admin', 'super_admin')
    )
  );
