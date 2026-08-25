-- AlterTable: quien registro la postulacion (Directiva / comunero / empresa)
ALTER TABLE "Postulacion" ADD COLUMN IF NOT EXISTS "submittedById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Postulacion_submittedById_fkey'
  ) THEN
    ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_submittedById_fkey"
      FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
