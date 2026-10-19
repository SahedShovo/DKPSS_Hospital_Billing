-- Fixed discount amounts. Percentage columns remain for historical bill compatibility.
ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS bill_discount_value numeric(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE bill_items
  ADD COLUMN IF NOT EXISTS item_discount_value numeric(12, 2) NOT NULL DEFAULT 0;
