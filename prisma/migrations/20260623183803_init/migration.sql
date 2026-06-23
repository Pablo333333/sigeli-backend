-- AlterTable
ALTER TABLE "CV" ADD COLUMN     "specialty" TEXT;

-- AlterTable
ALTER TABLE "Reclamo" ADD COLUMN     "respuestaOficial" TEXT;

-- CreateTable
CREATE TABLE "SemaforoHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nivelAnterior" "TrustLevel" NOT NULL,
    "nivelNuevo" "TrustLevel" NOT NULL,
    "justificacion" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SemaforoHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SemaforoHistory" ADD CONSTRAINT "SemaforoHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
