-- CreateEnum
CREATE TYPE "TipoManoObra" AS ENUM ('NO_CALIFICADA', 'SEMI_CALIFICADA', 'CALIFICADA', 'PROFESIONAL', 'TECNICO', 'PRACTICAS');

-- CreateEnum
CREATE TYPE "OfertaStatus" AS ENUM ('VIGENTE', 'CULMINADO');

-- AlterTable Oferta: columnas nuevas
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "perfilRequisitos" TEXT;
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "tipoManoObra" "TipoManoObra" NOT NULL DEFAULT 'NO_CALIFICADA';
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "fechaInicioProyectada" TIMESTAMP(3);
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "fechaCierre" TIMESTAMP(3);
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "regimenLaboral" TEXT;
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "tiempoContratoMeses" INTEGER;
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "horarioTrabajo" TEXT;
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "sistemaTrabajo" TEXT;
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "notaAviso" TEXT;

-- Migrar status string -> OfertaStatus
ALTER TABLE "Oferta" ADD COLUMN IF NOT EXISTS "status_new" "OfertaStatus" NOT NULL DEFAULT 'VIGENTE';

UPDATE "Oferta"
SET "status_new" = CASE
  WHEN "status"::text IN ('ABIERTA', 'VIGENTE', 'abierta', 'vigente') THEN 'VIGENTE'::"OfertaStatus"
  ELSE 'CULMINADO'::"OfertaStatus"
END;

ALTER TABLE "Oferta" DROP COLUMN IF EXISTS "status";
ALTER TABLE "Oferta" RENAME COLUMN "status_new" TO "status";

-- requirements ahora opcional
ALTER TABLE "Oferta" ALTER COLUMN "requirements" DROP NOT NULL;

-- FK tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Oferta_tenantId_fkey'
  ) THEN
    ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
