import { PrismaClient } from '@prisma/client';

export const softDeleteMiddleware = (prisma: PrismaClient) => {
  /***********************************/
  /* READ OPERATIONS */
  /***********************************/
  prisma.$use(async (params, next) => {
    if (['User', 'CV', 'ExperienciaLaboral', 'Educacion', 'Oferta', 'Postulacion', 'Contrato', 'Capacitacion', 'Evaluacion'].includes(params.model)) {
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        // Cambiar a findFirst para permitir filtrar por deletedAt
        params.action = 'findFirst';
        params.args.where = { ...params.args.where, deletedAt: null };
      }
      if (params.action === 'findMany') {
        if (params.args.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        } else {
          params.args.where = { deletedAt: null };
        }
      }
      if (params.action === 'count') {
        if (params.args.where) {
          params.args.where = { ...params.args.where, deletedAt: null };
        } else {
          params.args.where = { deletedAt: null };
        }
      }
    }
    return next(params);
  });

  /***********************************/
  /* DELETE OPERATIONS */
  /***********************************/
  prisma.$use(async (params, next) => {
    if (['User', 'CV', 'ExperienciaLaboral', 'Educacion', 'Oferta', 'Postulacion', 'Contrato', 'Capacitacion', 'Evaluacion'].includes(params.model)) {
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
      }
      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        if (params.args.data) {
          params.args.data.deletedAt = new Date();
        } else {
          params.args.data = { deletedAt: new Date() };
        }
      }
    }
    return next(params);
  });
};
