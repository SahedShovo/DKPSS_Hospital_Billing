-- Allow patient ages such as "6 month" while preserving existing numeric ages.
ALTER TABLE patients
  ALTER COLUMN age TYPE varchar(40)
  USING age::text;
