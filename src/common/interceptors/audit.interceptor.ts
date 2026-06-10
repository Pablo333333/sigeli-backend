import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;

    return next.handle().pipe(
      tap(async (data) => {
        // Solo auditamos mutaciones exitosas
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
          await this.logAction(url, data?.id || body?.id, method, data, user?.id, 'SUCCESS');
        }
      }),
      catchError(async (error) => {
        // Auditamos intentos fallidos en mutaciones
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
          await this.logAction(url, body?.id || 'N/A', method, { error: error.message }, user?.id, 'FAILED');
        }
        return throwError(() => error);
      })
    );
  }

  private async logAction(url: string, entityId: string, action: string, data: any, userId: string, status: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          entityName: url.split('/')[1] || 'unknown',
          entityId: entityId || 'N/A',
          action: `${action}_${status}`,
          oldData: null,
          newData: data || {},
          userId: userId || 'SYSTEM',
          immutableHash: 'sha256-placeholder',
        },
      });
    } catch (err) {
      console.error('Error saving audit log:', err);
    }
  }
}
