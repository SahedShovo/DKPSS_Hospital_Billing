-- Rebuild cached bill balances from the payment and refund ledger.
-- Refund amounts are stored as negative values.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM shifts
    WHERE status = 'OPEN'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Resolve users with more than one OPEN shift before applying this migration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM admissions
    WHERE status = 'ADMITTED'
    GROUP BY patient_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Resolve patients with more than one ADMITTED record before applying this migration';
  END IF;
END $$;

-- Before bill-level allocations were recorded, due-payment receipts existed only
-- in due_payments and the bill balance stayed unchanged. Backfill those legacy
-- receipts against the patient's oldest outstanding bills that already existed
-- when the receipt was issued. Receipts already linked by the current code are
-- left alone.
WITH legacy_receipts AS (
  SELECT dp.id, dp.patient_id, dp.received_by, dp.shift_id, dp.paid_at, dp.amount,
    COALESCE(
      SUM(dp.amount) OVER (
        PARTITION BY dp.patient_id
        ORDER BY dp.paid_at, dp.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ), 0
    ) AS range_start,
    SUM(dp.amount) OVER (
      PARTITION BY dp.patient_id
      ORDER BY dp.paid_at, dp.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS range_end
  FROM due_payments dp
  WHERE NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.due_payment_id = dp.id
  )
), bill_ranges AS (
  SELECT b.id, b.patient_id, b.created_at,
    GREATEST(b.net_amount - b.total_paid, 0) AS due,
    COALESCE(
      SUM(GREATEST(b.net_amount - b.total_paid, 0)) OVER (
        PARTITION BY b.patient_id
        ORDER BY b.created_at, b.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ), 0
    ) AS range_start,
    SUM(GREATEST(b.net_amount - b.total_paid, 0)) OVER (
      PARTITION BY b.patient_id
      ORDER BY b.created_at, b.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS range_end
  FROM bills b
  WHERE b.status = 'ACTIVE'
), allocations AS (
  SELECT r.id AS due_payment_id, r.received_by, r.shift_id, r.paid_at,
    b.id AS bill_id,
    LEAST(r.range_end, b.range_end) - GREATEST(r.range_start, b.range_start) AS amount
  FROM legacy_receipts r
  JOIN bill_ranges b
    ON b.patient_id = r.patient_id
   AND b.created_at <= r.paid_at
   AND r.range_end > b.range_start
   AND b.range_end > r.range_start
)
INSERT INTO payments (bill_id, received_by, shift_id, due_payment_id, amount, paid_at)
SELECT bill_id, received_by, shift_id, due_payment_id, amount, paid_at
FROM allocations
WHERE amount > 0;

DO $$
DECLARE
  unresolved_ids text;
BEGIN
  SELECT string_agg(unallocated.id::text, ', ')
  INTO unresolved_ids
  FROM (
    SELECT dp.id
    FROM due_payments dp
    LEFT JOIN payments p ON p.due_payment_id = dp.id
    GROUP BY dp.id, dp.amount
    HAVING COALESCE(SUM(p.amount), 0) <> dp.amount
  ) AS unallocated;

  IF unresolved_ids IS NOT NULL THEN
    RAISE EXCEPTION 'Could not fully map due-payment receipt id(s): %; review these receipts before retrying', unresolved_ids;
  END IF;
END $$;

WITH payment_totals AS (
  SELECT bill_id, SUM(amount) AS amount
  FROM payments
  GROUP BY bill_id
), refund_totals AS (
  SELECT bill_id, SUM(amount) AS amount
  FROM refunds
  GROUP BY bill_id
), ledger_totals AS (
  SELECT
    b.id,
    COALESCE(p.amount, 0) + COALESCE(r.amount, 0) AS total_paid
  FROM bills b
  LEFT JOIN payment_totals p ON p.bill_id = b.id
  LEFT JOIN refund_totals r ON r.bill_id = b.id
)
UPDATE bills b
SET
  total_paid = ledger.total_paid,
  due_amount = CASE
    WHEN b.status = 'CANCELLED' THEN 0
    ELSE GREATEST(b.net_amount - ledger.total_paid, 0)
  END,
  updated_at = NOW()
FROM ledger_totals ledger
WHERE ledger.id = b.id;

-- Database safeguards for invariants also protected by row locks in the API.
CREATE UNIQUE INDEX IF NOT EXISTS shifts_one_open_per_user_idx
  ON shifts (user_id)
  WHERE status = 'OPEN';

CREATE UNIQUE INDEX IF NOT EXISTS admissions_one_active_per_patient_idx
  ON admissions (patient_id)
  WHERE status = 'ADMITTED';

COMMIT;
