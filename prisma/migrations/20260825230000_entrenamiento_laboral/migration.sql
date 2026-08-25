-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TipoCapacitacion" AS ENUM ('CV_HISTORIAL', 'PROGRAMA_ENTRENAMIENTO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable Capacitacion
ALTER TABLE "Capacitacion" ADD COLUMN IF NOT EXISTS "tipo" "TipoCapacitacion" NOT NULL DEFAULT 'CV_HISTORIAL';
ALTER TABLE "Capacitacion" ADD COLUMN IF NOT EXISTS "socioOrganizador" TEXT;

-- Unique enrollment
CREATE UNIQUE INDEX IF NOT EXISTS "CapacitacionUsuario_userId_capacitacionId_key"
  ON "CapacitacionUsuario"("userId", "capacitacionId");

-- CreateTable encuesta entrenamiento laboral
CREATE TABLE IF NOT EXISTS "EncuestaEntrenamientoLaboral" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capacitadoPorAntamina" BOOLEAN NOT NULL DEFAULT false,
    "anioParticipacion" INTEGER,
    "socioOrganizador" TEXT,
    "nombrePrograma" TEXT,
    "horas" INTEGER,
    "temas" TEXT,
    "obtuvoCertificado" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "respuestas" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncuestaEntrenamientoLaboral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EncuestaEntrenamientoLaboral_userId_key"
  ON "EncuestaEntrenamientoLaboral"("userId");

DO $$ BEGIN
  ALTER TABLE "EncuestaEntrenamientoLaboral"
    ADD CONSTRAINT "EncuestaEntrenamientoLaboral_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
