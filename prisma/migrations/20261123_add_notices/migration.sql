-- Notices shown at the top of selected employees' timesheet submit page
CREATE TABLE IF NOT EXISTS "notices" (
  "id" SERIAL PRIMARY KEY,
  "message" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "all_employees" BOOLEAN NOT NULL DEFAULT false,
  "employee_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
