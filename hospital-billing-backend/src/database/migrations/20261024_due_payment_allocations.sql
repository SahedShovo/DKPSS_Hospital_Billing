ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS due_payment_id integer;
