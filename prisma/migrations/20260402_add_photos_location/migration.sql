-- Add photo storage and GPS location to WorkHours table
ALTER TABLE "WorkHours" ADD COLUMN IF NOT EXISTS "photos" TEXT;
ALTER TABLE "WorkHours" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "WorkHours" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "WorkHours" ADD COLUMN IF NOT EXISTS "location_name" TEXT;
