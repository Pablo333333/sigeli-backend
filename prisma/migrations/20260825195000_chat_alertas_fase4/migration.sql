-- CreateEnum
CREATE TYPE "ComunicacionEstado" AS ENUM ('PENDIENTE', 'LEIDO', 'RESPONDIDO');

-- CreateTable ComunicacionPostulacion
CREATE TABLE IF NOT EXISTS "ComunicacionPostulacion" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "remitenteId" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" "ComunicacionEstado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComunicacionPostulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable AlertaDeadline
CREATE TABLE IF NOT EXISTS "AlertaDeadline" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertaDeadline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AlertaDeadline_postulacionId_eventId_key"
  ON "AlertaDeadline"("postulacionId", "eventId");

CREATE INDEX IF NOT EXISTS "ComunicacionPostulacion_postulacionId_idx"
  ON "ComunicacionPostulacion"("postulacionId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComunicacionPostulacion_postulacionId_fkey') THEN
    ALTER TABLE "ComunicacionPostulacion" ADD CONSTRAINT "ComunicacionPostulacion_postulacionId_fkey"
      FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComunicacionPostulacion_remitenteId_fkey') THEN
    ALTER TABLE "ComunicacionPostulacion" ADD CONSTRAINT "ComunicacionPostulacion_remitenteId_fkey"
      FOREIGN KEY ("remitenteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComunicacionPostulacion_destinatarioId_fkey') THEN
    ALTER TABLE "ComunicacionPostulacion" ADD CONSTRAINT "ComunicacionPostulacion_destinatarioId_fkey"
      FOREIGN KEY ("destinatarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AlertaDeadline_postulacionId_fkey') THEN
    ALTER TABLE "AlertaDeadline" ADD CONSTRAINT "AlertaDeadline_postulacionId_fkey"
      FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
