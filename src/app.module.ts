import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { CVModule } from './modules/cv/cv.module';
import { PostulacionModule } from './modules/postulacion/postulacion.module';
import { ContratoModule } from './modules/contrato/contrato.module';
import { AnaliticaModule } from './modules/analitica/analitica.module';
import { CapacitacionModule } from './modules/capacitacion/capacitacion.module';
import { TransparenciaModule } from './modules/transparencia/transparencia.module';
import { OfertaModule } from './modules/oferta/oferta.module';
import { VozModule } from './modules/voz/voz.module';
import { EvaluacionModule } from './modules/evaluacion/evaluacion.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { GobernanzaModule } from './modules/gobernanza/gobernanza.module';
import { AuthModule } from './modules/auth/auth.module';
import { IAModule } from './modules/ia/ia.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule, 
    CommonModule,
    AuthModule,
    IAModule,
    CVModule, 
    PostulacionModule, 
    ContratoModule,
    AnaliticaModule,
    CapacitacionModule,
    TransparenciaModule,
    OfertaModule,
    VozModule,
    EvaluacionModule,
    NotificacionesModule,
    GobernanzaModule
  ],
})
export class AppModule {}
