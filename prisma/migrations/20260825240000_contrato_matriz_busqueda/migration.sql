-- AlterTable Contrato: matriz ampliada
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "numeroContrato" TEXT;
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "puesto" TEXT;
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "cargo" TEXT;
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "area" TEXT;
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "sector" TEXT;
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "tipoManoObra" "TipoManoObra";
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "tiempoContratoMeses" INTEGER;
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "horarioTrabajo" TEXT;
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "sistemaTrabajo" TEXT;
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "observaciones" TEXT;

CREATE INDEX IF NOT EXISTS "Contrato_companyName_idx" ON "Contrato"("companyName");
CREATE INDEX IF NOT EXISTS "Contrato_puesto_idx" ON "Contrato"("puesto");