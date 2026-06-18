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
    { fullName: 'Juan Quispe', dni: '70123456', email: 'juan@sigeli.com' },
    { fullName: 'Maria Condori', dni: '70234567', email: 'maria@sigeli.com' },
    { fullName: 'Pedro Mamani', dni: '70345678', email: 'pedro@sigeli.com' },
  ];

  const createdComuneros = [];
  for (const c of comuneros) {
    const user = await prisma.user.upsert({
      where: { dni: c.dni },
      update: {},
      create: {
        ...c,
        password: password,
        role: Role.COMUNERO,
        tenantId: tenant.id,
      },
    });
    createdComuneros.push(user);
  }

  // Crear Capacitaciones
  const capacitaciones = [
    {
      title: 'Curso Avanzado de Operación de Excavadora',
      description: 'Capacitación técnica de alto nivel para operadores de maquinaria pesada.',
      sector: 'Minería',
      learningPath: { entidad: 'Tecsup', duracion: 6, anio: 2026 },
      futureDemand: true,
    },
    {
      title: 'Certificación en Seguridad Industrial y Minera',
      description: 'Estándares internacionales de seguridad y salud en el trabajo minero.',
      sector: 'Seguridad',
      learningPath: { entidad: 'Senati', duracion: 3, anio: 2026 },
      futureDemand: true,
    },
    {
      title: 'Taller de Mantenimiento Eléctrico Industrial',
      description: 'Fundamentos y prácticas avanzadas de electricidad en plantas industriales.',
      sector: 'Mantenimiento',
      learningPath: { entidad: 'Tecsup', duracion: 4, anio: 2026 },
      futureDemand: false,
    },
    {
      title: 'Gestión Logística y Almacenes',
      description: 'Optimización de cadena de suministro para operaciones mineras.',
      sector: 'Logística',
      learningPath: { entidad: 'Cámara de Comercio', duracion: 2, anio: 2026 },
      futureDemand: false,
    },
  ];

  for (const cap of capacitaciones) {
    const createdCap = await prisma.capacitacion.create({
      data: cap,
    });

    // Vincular algunos comuneros
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
  }

  // Crear Ofertas Laborales
  const ofertas = [
    {
      title: 'Operador de Excavadora',
      description: 'Se requiere operador con experiencia en minería de tajo abierto para Antamina.',
      sector: 'Minería / Huari',
      salary: 4500,
      vacancies: 5,
      status: 'ABIERTA',
      requirements: { experiencia: '3 años', certificacion: 'Tecsup/Senati', regimen: '14x7' },
    },
    {
      title: 'Técnico de Mantenimiento Eléctrico',
      description: 'Mantenimiento preventivo y correctivo de palas eléctricas y perforadoras.',
      sector: 'Mantenimiento / Ancash',
      salary: 5200,
      vacancies: 3,
      status: 'ABIERTA',
      requirements: { experiencia: '2 años', certificacion: 'Técnico Electricista', regimen: '20x10' },
    },
    {
      title: 'Supervisor de Seguridad Industrial',
      description: 'Liderar el cumplimiento de estándares de seguridad y salud ocupacional.',
      sector: 'Seguridad / Antamina',
      salary: 7500,
      vacancies: 2,
      status: 'ABIERTA',
      requirements: { experiencia: '5 años', grado: 'Ingeniero Colegiado', regimen: '10x10' },
    },
    {
      title: 'Auxiliar de Almacén',
      description: 'Gestión de inventarios y despacho de repuestos críticos.',
      sector: 'Logística / Huarmey',
      salary: 2800,
      vacancies: 4,
      status: 'ABIERTA',
      requirements: { experiencia: '1 año', certificacion: 'Básica', regimen: '5x2' },
    },
  ];

  for (const ofe of ofertas) {
    await prisma.oferta.create({
      data: ofe,
    });
  }

  console.log(`Seed completado: Usuario test@admin.com, ${empresas.length} empresas, ${comuneros.length} comuneros, ${capacitaciones.length} capacitaciones y ${ofertas.length} ofertas creadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
