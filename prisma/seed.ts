import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('1234', 10);

  // Crear un Tenant de prueba
  const tenant = await prisma.tenant.upsert({
    where: { id: 'test-tenant-id' },
    update: {},
    create: {
      id: 'test-tenant-id',
      name: 'Comunidad de Prueba',
      type: 'COMUNIDAD',
    },
  });

  // Crear usuario administrador
  await prisma.user.upsert({
    where: { email: 'test@admin.com' },
    update: {
      password: password,
      role: Role.ADMIN,
    },
    create: {
      email: 'test@admin.com',
      password: password,
      fullName: 'Administrador SIGELI',
      dni: '12345678',
      role: Role.ADMIN,
      tenantId: tenant.id,
    },
  });

  // Sectores / centros poblados georreferenciados (Área de influencia Ancash)
  const sectoresGeo = [
    {
      id: 'sec-huari',
      codigo: 'HUARI',
      nombre: 'Huari',
      aliases: ['Huari', 'Minería / Huari', 'Mineria / Huari'],
      latitud: -9.3472,
      longitud: -77.1711,
      provincia: 'Huari',
      distrito: 'Huari',
    },
    {
      id: 'sec-huarmey',
      codigo: 'HUARMEY',
      nombre: 'Huarmey',
      aliases: ['Huarmey', 'Logística / Huarmey', 'Logistica / Huarmey'],
      latitud: -10.0681,
      longitud: -78.1522,
      provincia: 'Huarmey',
      distrito: 'Huarmey',
    },
    {
      id: 'sec-san-marcos',
      codigo: 'SAN_MARCOS',
      nombre: 'San Marcos',
      aliases: ['San Marcos', 'Antamina', 'Seguridad / Antamina'],
      latitud: -9.525,
      longitud: -77.158,
      provincia: 'Huari',
      distrito: 'San Marcos',
    },
    {
      id: 'sec-chavin',
      codigo: 'CHAVIN',
      nombre: 'Chavín de Huántar',
      aliases: ['Chavin', 'Chavín', 'Chavin de Huantar', 'Chavín de Huántar'],
      latitud: -9.5944,
      longitud: -77.1778,
      provincia: 'Huari',
      distrito: 'Chavín de Huántar',
    },
    {
      id: 'sec-huaraz',
      codigo: 'HUARAZ',
      nombre: 'Huaraz',
      aliases: ['Huaraz', 'Ancash', 'Mantenimiento / Ancash'],
      latitud: -9.5267,
      longitud: -77.5278,
      provincia: 'Huaraz',
      distrito: 'Huaraz',
    },
    {
      id: 'sec-catac',
      codigo: 'CATAC',
      nombre: 'Catac',
      aliases: ['Catac'],
      latitud: -9.613,
      longitud: -77.431,
      provincia: 'Recuay',
      distrito: 'Catac',
    },
    {
      id: 'sec-cajacay',
      codigo: 'CAJACAY',
      nombre: 'Cajacay',
      aliases: ['Cajacay'],
      latitud: -10.153,
      longitud: -77.439,
      provincia: 'Bolognesi',
      distrito: 'Cajacay',
    },
  ];

  for (const s of sectoresGeo) {
    await prisma.sectorGeografico.upsert({
      where: { codigo: s.codigo },
      update: {
        nombre: s.nombre,
        aliases: s.aliases,
        latitud: s.latitud,
        longitud: s.longitud,
        provincia: s.provincia,
        distrito: s.distrito,
        activo: true,
        deletedAt: null,
      },
      create: {
        id: s.id,
        codigo: s.codigo,
        nombre: s.nombre,
        aliases: s.aliases,
        latitud: s.latitud,
        longitud: s.longitud,
        departamento: 'Ancash',
        provincia: s.provincia,
        distrito: s.distrito,
      },
    });
  }

  // Comunero de prueba (mismo password documentado para QA / cliente)
  // Email: comunero.test@sigeli.com | Password: Password123! | DNI: 00000000
  const testPassword = await bcrypt.hash('Password123!', 10);
  await prisma.user.upsert({
    where: { email: 'comunero.test@sigeli.com' },
    update: {
      password: testPassword,
      role: Role.COMUNERO,
      dni: '00000000',
      fullName: 'Comunero de Prueba',
      points: 100,
      sector: 'Huari',
      deletedAt: null,
    },
    create: {
      email: 'comunero.test@sigeli.com',
      password: testPassword,
      fullName: 'Comunero de Prueba',
      dni: '00000000',
      role: Role.COMUNERO,
      points: 100,
      sector: 'Huari',
      tenantId: tenant.id,
    },
  });

  // Directiva Comunal de prueba
  // Email: directiva.test@sigeli.com | Password: Password123! | DNI: 11111111
  await prisma.user.upsert({
    where: { email: 'directiva.test@sigeli.com' },
    update: {
      password: testPassword,
      role: Role.DIRECTIVA,
      dni: '11111111',
      fullName: 'Directiva Comunal de Prueba',
      points: 0,
      deletedAt: null,
    },
    create: {
      email: 'directiva.test@sigeli.com',
      password: testPassword,
      fullName: 'Directiva Comunal de Prueba',
      dni: '11111111',
      role: Role.DIRECTIVA,
      points: 0,
      tenantId: tenant.id,
    },
  });

  // Crear empresas socias / contratistas
  const empresas = [
    { name: 'Ferreyros S.A.', type: 'MINERA' },
    { name: 'Cosapi Minería', type: 'MINERA' },
    { name: 'Sodexo Perú', type: 'MINERA' },
    { name: 'San Martín Contratistas Generales', type: 'MINERA' },
    { name: 'JNJ Contratistas', type: 'MINERA' },
  ];

  for (const emp of empresas) {
    await prisma.tenant.upsert({
      where: { id: `tenant-${emp.name.toLowerCase().replace(/\s/g, '-')}` },
      update: {},
      create: {
        id: `tenant-${emp.name.toLowerCase().replace(/\s/g, '-')}`,
        name: emp.name,
        type: emp.type,
      },
    });
  }

  // Crear Comuneros de prueba
  const comuneros = [
    {
      fullName: 'Juan Quispe',
      dni: '70123456',
      email: 'juan@sigeli.com',
      gender: 'MASCULINO' as const,
      sector: 'Huari',
      birthDate: '15031995',
      specialty: 'Operador de maquinaria',
      yearsMining: 4,
    },
    {
      fullName: 'Maria Condori',
      dni: '70234567',
      email: 'maria@sigeli.com',
      gender: 'FEMENINO' as const,
      sector: 'Huarmey',
      birthDate: '22081998',
      specialty: 'Técnico electricista',
      yearsMining: 2,
    },
    {
      fullName: 'Pedro Mamani',
      dni: '70345678',
      email: 'pedro@sigeli.com',
      gender: 'MASCULINO' as const,
      sector: 'San Marcos',
      birthDate: '05011988',
      specialty: 'Ingeniero de minas',
      yearsMining: 8,
    },
  ];

  const createdComuneros = [];
  for (const c of comuneros) {
    const { birthDate, specialty, yearsMining, ...userData } = c;
    const user = await prisma.user.upsert({
      where: { dni: c.dni },
      update: {
        gender: userData.gender,
        sector: userData.sector,
      },
      create: {
        ...userData,
        password: password,
        role: Role.COMUNERO,
        tenantId: tenant.id,
      },
    });
    await prisma.cV.upsert({
      where: { userId: user.id },
      update: {
        specialty,
        yearsExperienceMining: yearsMining,
        multimedia: { profileMeta: { birthDate } },
      },
      create: {
        userId: user.id,
        specialty,
        yearsExperience: yearsMining,
        yearsExperienceMining: yearsMining,
        yearsExperienceGeneral: 1,
        multimedia: { profileMeta: { birthDate } },
      },
    });
    createdComuneros.push(user);
  }

  // Crear Capacitaciones
  // CV_HISTORIAL = historial del CV | PROGRAMA_ENTRENAMIENTO = Antamina / socio (dashboard)
  const capacitaciones = [
    {
      title: 'Curso Avanzado de Operación de Excavadora',
      description: 'Capacitación técnica de alto nivel para operadores de maquinaria pesada.',
      sector: 'Minería',
      learningPath: { entidad: 'Tecsup', duracion: 6, anio: 2026 },
      futureDemand: true,
      tipo: 'CV_HISTORIAL' as const,
      socioOrganizador: null as string | null,
    },
    {
      title: 'Certificación en Seguridad Industrial y Minera',
      description: 'Estándares internacionales de seguridad y salud en el trabajo minero.',
      sector: 'Seguridad',
      learningPath: { entidad: 'Senati', duracion: 3, anio: 2026 },
      futureDemand: true,
      tipo: 'CV_HISTORIAL' as const,
      socioOrganizador: null as string | null,
    },
    {
      title: 'Taller de Mantenimiento Eléctrico Industrial',
      description: 'Fundamentos y prácticas avanzadas de electricidad en plantas industriales.',
      sector: 'Mantenimiento',
      learningPath: { entidad: 'Tecsup', duracion: 4, anio: 2026 },
      futureDemand: false,
      tipo: 'CV_HISTORIAL' as const,
      socioOrganizador: null as string | null,
    },
    {
      title: 'Gestión Logística y Almacenes',
      description: 'Optimización de cadena de suministro para operaciones mineras.',
      sector: 'Logística',
      learningPath: { entidad: 'Cámara de Comercio', duracion: 2, anio: 2026 },
      futureDemand: false,
      tipo: 'CV_HISTORIAL' as const,
      socioOrganizador: null as string | null,
    },
    {
      title: 'Programa de Entrenamiento Laboral Antamina — Operadores',
      description:
        'Programa oficial de entrenamiento laboral con Antamina y socios. Alimenta el indicador del dashboard.',
      sector: 'Minería',
      learningPath: { entidad: 'Antamina', duracion: 4, anio: 2025 },
      futureDemand: true,
      tipo: 'PROGRAMA_ENTRENAMIENTO' as const,
      socioOrganizador: 'Antamina',
    },
    {
      title: 'Programa de Entrenamiento Laboral — Soldadura con Ferreyros',
      description: 'Entrenamiento laboral en soldadura industrial organizado con socio Ferreyros.',
      sector: 'Mantenimiento',
      learningPath: { entidad: 'Ferreyros', duracion: 3, anio: 2025 },
      futureDemand: true,
      tipo: 'PROGRAMA_ENTRENAMIENTO' as const,
      socioOrganizador: 'Ferreyros',
    },
  ];

  for (const cap of capacitaciones) {
    const createdCap = await prisma.capacitacion.create({
      data: {
        title: cap.title,
        description: cap.description,
        sector: cap.sector,
        learningPath: cap.learningPath,
        futureDemand: cap.futureDemand,
        tipo: cap.tipo,
        socioOrganizador: cap.socioOrganizador,
      },
    });

    // Vincular comuneros solo a historial CV; programa se vincula aparte al test user
    if (cap.tipo === 'CV_HISTORIAL') {
      for (const user of createdComuneros) {
        await prisma.capacitacionUsuario.create({
          data: {
            userId: user.id,
            capacitacionId: createdCap.id,
            progress: Math.floor(Math.random() * 100),
            isCertified: Math.random() > 0.7,
          },
        });
      }
    } else if (cap.tipo === 'PROGRAMA_ENTRENAMIENTO' && createdComuneros[0]) {
      await prisma.capacitacionUsuario.upsert({
        where: {
          userId_capacitacionId: {
            userId: createdComuneros[0].id,
            capacitacionId: createdCap.id,
          },
        },
        update: {},
        create: {
          userId: createdComuneros[0].id,
          capacitacionId: createdCap.id,
          progress: 80,
          isCertified: false,
        },
      });
    }
  }

  // Crear Ofertas Laborales (matriz completa)
  const mineraTenant = await prisma.tenant.findFirst({ where: { type: 'MINERA' } });
  const cierre = new Date();
  cierre.setDate(cierre.getDate() + 30);

  const ofertas = [
    {
      id: 'oferta-seed-1',
      title: 'Operador de Excavadora',
      description: 'Operar excavadora en minería de tajo abierto. Cumplir estándares de seguridad Antamina.',
      perfilRequisitos: 'Experiencia 3 años, certificación Tecsup/Senati, licencia vigente.',
      sector: 'Minería / Huari',
      salary: 4500,
      vacancies: 5,
      status: 'VIGENTE' as const,
      tipoManoObra: 'CALIFICADA' as const,
      regimenLaboral: '728',
      tiempoContratoMeses: 6,
      horarioTrabajo: 'Turnos diurnos',
      sistemaTrabajo: '14x7',
      fechaInicioProyectada: new Date(),
      fechaCierre: cierre,
      companyName: mineraTenant?.name || 'Ferreyros S.A.',
      tenantId: mineraTenant?.id,
      notaAviso: 'Convocatoria prioritaria para comuneros del área de influencia.',
      requirements: { experiencia: '3 años', certificacion: 'Tecsup/Senati' },
    },
    {
      id: 'oferta-seed-2',
      title: 'Técnico de Mantenimiento Eléctrico',
      description: 'Mantenimiento preventivo y correctivo de palas eléctricas y perforadoras.',
      perfilRequisitos: 'Técnico electricista, 2 años de experiencia.',
      sector: 'Mantenimiento / Ancash',
      salary: 5200,
      vacancies: 3,
      status: 'VIGENTE' as const,
      tipoManoObra: 'TECNICO' as const,
      regimenLaboral: '728',
      tiempoContratoMeses: 8,
      horarioTrabajo: 'Rotativo',
      sistemaTrabajo: '20x10',
      fechaInicioProyectada: new Date(),
      fechaCierre: cierre,
      companyName: mineraTenant?.name || 'Ferreyros S.A.',
      tenantId: mineraTenant?.id,
      requirements: { experiencia: '2 años', certificacion: 'Técnico Electricista' },
    },
    {
      id: 'oferta-seed-3',
      title: 'Supervisor de Seguridad Industrial',
      description: 'Liderar el cumplimiento de estándares de seguridad y salud ocupacional.',
      perfilRequisitos: 'Ingeniero colegiado, 5 años de experiencia.',
      sector: 'Seguridad / Antamina',
      salary: 7500,
      vacancies: 2,
      status: 'VIGENTE' as const,
      tipoManoObra: 'PROFESIONAL' as const,
      regimenLaboral: '728',
      tiempoContratoMeses: 12,
      horarioTrabajo: 'Administrativo de campo',
      sistemaTrabajo: '10x10',
      fechaInicioProyectada: new Date(),
      fechaCierre: cierre,
      companyName: mineraTenant?.name || 'Cosapi Minería',
      tenantId: mineraTenant?.id,
      requirements: { experiencia: '5 años', grado: 'Ingeniero Colegiado' },
    },
    {
      id: 'oferta-seed-4',
      title: 'Auxiliar de Almacén',
      description: 'Gestión de inventarios y despacho de repuestos críticos.',
      perfilRequisitos: 'Secundaria completa, 1 año de experiencia deseable.',
      sector: 'Logística / Huarmey',
      salary: 2800,
      vacancies: 4,
      status: 'VIGENTE' as const,
      tipoManoObra: 'SEMI_CALIFICADA' as const,
      regimenLaboral: '1057',
      tiempoContratoMeses: 3,
      horarioTrabajo: 'Lunes a viernes 8:00-17:00',
      sistemaTrabajo: '5x2',
      fechaInicioProyectada: new Date(),
      fechaCierre: cierre,
      companyName: mineraTenant?.name || 'Sodexo Perú',
      tenantId: mineraTenant?.id,
      requirements: { experiencia: '1 año', certificacion: 'Básica' },
    },
  ];

  for (const ofe of ofertas) {
    await prisma.oferta.upsert({
      where: { id: ofe.id },
      update: { ...ofe },
      create: { ...ofe },
    });
  }

  // Contrato activo de demo para evaluación 360° (comunero.test)
  const comuneroTest = await prisma.user.findUnique({
    where: { email: 'comunero.test@sigeli.com' },
  });

  if (comuneroTest) {
    const POSTULACION_EVAL_ID = 'a1111111-1111-4111-8111-111111111101';
    const CONTRATO_EVAL_ID = 'a1111111-1111-4111-8111-111111111102';

    // Encuesta programa de entrenamiento laboral (alimenta dashboard)
    await prisma.encuestaEntrenamientoLaboral.upsert({
      where: { userId: comuneroTest.id },
      update: {
        capacitadoPorAntamina: true,
        anioParticipacion: 2024,
        socioOrganizador: 'Antamina',
        nombrePrograma: 'Programa de Entrenamiento Laboral',
        horas: 120,
        temas: 'Operación de maquinaria, seguridad industrial',
        obtuvoCertificado: true,
      },
      create: {
        userId: comuneroTest.id,
        capacitadoPorAntamina: true,
        anioParticipacion: 2024,
        socioOrganizador: 'Antamina',
        nombrePrograma: 'Programa de Entrenamiento Laboral',
        horas: 120,
        temas: 'Operación de maquinaria, seguridad industrial',
        obtuvoCertificado: true,
      },
    });

    // Inscribir al comunero de prueba en cursos del programa
    const cursosPrograma = await prisma.capacitacion.findMany({
      where: { tipo: 'PROGRAMA_ENTRENAMIENTO', deletedAt: null },
    });
    for (const curso of cursosPrograma) {
      await prisma.capacitacionUsuario.upsert({
        where: {
          userId_capacitacionId: {
            userId: comuneroTest.id,
            capacitacionId: curso.id,
          },
        },
        update: { progress: 100, isCertified: true },
        create: {
          userId: comuneroTest.id,
          capacitacionId: curso.id,
          progress: 100,
          isCertified: true,
        },
      });
    }

    const postulacionDemo = await prisma.postulacion.upsert({
      where: { id: POSTULACION_EVAL_ID },
      update: {
        status: 'CONTRATADO',
        deletedAt: null,
      },
      create: {
        id: POSTULACION_EVAL_ID,
        userId: comuneroTest.id,
        ofertaId: 'oferta-seed-1',
        submittedById: comuneroTest.id,
        status: 'CONTRATADO',
        timeline: [
          {
            status: 'CONTRATADO',
            subStatus: 'SUBIDA_CONFIRMADA',
            date: new Date().toISOString(),
            notes: 'Postulación seed para demo de evaluación 360°',
          },
        ],
      },
    });

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6);

    await prisma.contrato.upsert({
      where: { postulacionId: postulacionDemo.id },
      update: {
        status: 'ACTIVO',
        endDate,
        deletedAt: null,
      },
      create: {
        id: CONTRATO_EVAL_ID,
        postulacionId: postulacionDemo.id,
        userId: comuneroTest.id,
        startDate: new Date(),
        endDate,
        salary: 4500,
        regimenLaboral: '728',
        status: 'ACTIVO',
        stabilityIndex: 6,
      },
    });
  }

  console.log('Seed completado.');
  console.log('  Admin:     test@admin.com / 1234');
  console.log('  Comunero:  comunero.test@sigeli.com / Password123! (DNI 00000000)');
  console.log('  Directiva: directiva.test@sigeli.com / Password123! (DNI 11111111)');
  console.log(`  Empresas: ${empresas.length}, comuneros: ${comuneros.length}, capacitaciones: ${capacitaciones.length}, ofertas: ${ofertas.length}`);
  console.log('  Contrato demo ACTIVO listo para Evaluación 360°');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
