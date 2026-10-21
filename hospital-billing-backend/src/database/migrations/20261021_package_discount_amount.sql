ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS package_discount_amount numeric(12, 2) NOT NULL DEFAULT 0;
