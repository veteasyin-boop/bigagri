-- 20261024100000_lucky_draw_tickets.sql
-- Module 2: Lucky Draw Server-Side Ticket Engine
-- Every genuine pack QR claimed generates a unique, auditable lucky draw ticket.
-- Tickets are bound to the tenant and QR code (at most one ticket per QR).
-- Farmers can only query their own tickets; brand/super admins can query tenant tickets.

CREATE TABLE IF NOT EXISTS public.lucky_draw_tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id),
  partner_id    uuid NOT NULL REFERENCES public.partners(id),
  qr_code_id    uuid REFERENCES public.qr_codes(id),
  ticket_number text NOT NULL,
  campaign_ref  text NOT NULL,
  draw_date     date NOT NULL DEFAULT '2026-12-31',
  status        text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'drawn', 'expired')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_lucky_draw_tickets_tenant_number UNIQUE (tenant_id, ticket_number),
  CONSTRAINT uq_lucky_draw_tickets_tenant_qr UNIQUE (tenant_id, qr_code_id)
);

CREATE INDEX IF NOT EXISTS idx_lucky_draw_tickets_partner
  ON public.lucky_draw_tickets (tenant_id, partner_id, created_at DESC);

ALTER TABLE public.lucky_draw_tickets ENABLE ROW LEVEL SECURITY;

-- Deny client modifications directly to tickets; client roles can only read
REVOKE ALL ON public.lucky_draw_tickets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lucky_draw_tickets TO authenticated;
GRANT ALL ON public.lucky_draw_tickets TO service_role;

-- Farmers can read only their own tickets
CREATE POLICY "partner reads own lucky draw tickets"
  ON public.lucky_draw_tickets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = lucky_draw_tickets.partner_id
        AND p.tenant_id = lucky_draw_tickets.tenant_id
        AND p.user_id = (SELECT auth.uid())
    )
  );

-- Brand admins and super admins can read all lucky draw tickets for their tenant
CREATE POLICY "brand admin reads tenant lucky draw tickets"
  ON public.lucky_draw_tickets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = lucky_draw_tickets.tenant_id
        AND tm.user_id = (SELECT auth.uid())
        AND tm.status = 'active'
        AND tm.role IN ('brand_admin', 'super_admin')
    )
  );
