import { Role } from '@prisma/client';

/**
 * Matriz de permisos SIGELI (Fase 1) según requerimiento del cliente:
 * - COMUNERO: CV, postular, seguimiento, chat, contrato/eval/reclamos propios
 * - EMPRESA: ofertas, CVs, seguimiento, chat, contratos, eval, reclamos, dashboard
 * - DIRECTIVA: monitorea, dashboard, postula por comuneros, seguimiento, chat
 *              NO registra CV propio, evaluaciones, quejas ni contratos
 * - ADMIN: todo
 */
export const RolePermissions = {
  /** Crear/actualizar CV (perfil propio o carga administrativa) */
  cvWrite: [Role.COMUNERO, Role.ADMIN, Role.EMPRESA] as Role[],
  /** Leer CVs */
  cvRead: [Role.COMUNERO, Role.EMPRESA, Role.DIRECTIVA, Role.ADMIN, Role.AUDITOR] as Role[],
  /** Crear/editar ofertas laborales */
  ofertaWrite: [Role.EMPRESA, Role.ADMIN] as Role[],
  /** Ver ofertas */
  ofertaRead: [Role.COMUNERO, Role.EMPRESA, Role.DIRECTIVA, Role.ADMIN, Role.AUDITOR] as Role[],
  /** Crear postulación (propia o en nombre de comunero) */
  postulacionWrite: [Role.COMUNERO, Role.DIRECTIVA, Role.EMPRESA, Role.ADMIN] as Role[],
  /** Avanzar estado del proceso */
  postulacionAdvance: [Role.EMPRESA, Role.DIRECTIVA, Role.ADMIN] as Role[],
  /** Ver postulaciones / seguimiento */
  postulacionRead: [Role.COMUNERO, Role.EMPRESA, Role.DIRECTIVA, Role.ADMIN, Role.AUDITOR] as Role[],
  /** Registrar reclamos/quejas */
  reclamoWrite: [Role.COMUNERO, Role.EMPRESA, Role.ADMIN] as Role[],
  /** Evaluaciones 360 */
  evaluacionWrite: [Role.COMUNERO, Role.EMPRESA, Role.ADMIN] as Role[],
  /** Gestión de contratos */
  contratoWrite: [Role.EMPRESA, Role.ADMIN] as Role[],
  /** Dashboards / analítica */
  dashboard: [Role.DIRECTIVA, Role.EMPRESA, Role.ADMIN, Role.AUDITOR] as Role[],
  /** Crear/editar cursos de capacitación o programa de entrenamiento */
  capacitacionWrite: [Role.EMPRESA, Role.ADMIN, Role.DIRECTIVA] as Role[],
  /** Gobernanza / acuerdos */
  gobernanza: [Role.DIRECTIVA, Role.ADMIN] as Role[],
};
