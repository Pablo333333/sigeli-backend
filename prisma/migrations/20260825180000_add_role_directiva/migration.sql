-- AlterEnum: agregar rol Directiva Comunal
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DIRECTIVA';
