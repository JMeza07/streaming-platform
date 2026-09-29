import { PrismaClient, UserRole, AccountStatus, SubscriptionStatus, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando carga de datos semilla (Seed)...');

  // =========================================================================
  // 1. USUARIOS Y ROLES (ADMIN, SOPORTE, VENDEDOR, CLIENTE)
  // =========================================================================
  console.log('👤 Creando usuarios del sistema...');

  const passwordAdmin = await bcrypt.hash('admin123', 10);
  const passwordSoporte = await bcrypt.hash('soporte123', 10);
  const passwordVendedor = await bcrypt.hash('vendedor123', 10);
  const passwordCliente = await bcrypt.hash('cliente123', 10);

  // 1.1 Administrador Principal
  const admin = await prisma.user.upsert({
    where: { email: 'admin@stream.com' },
    update: {
      nombre: 'Administrador Principal',
      passwordHash: passwordAdmin,
      rol: UserRole.ADMIN,
      activo: true,
    },
    create: {
      email: 'admin@stream.com',
      nombre: 'Administrador Principal',
      passwordHash: passwordAdmin,
      phone: '+573000000001',
      rol: UserRole.ADMIN,
      activo: true,
    },
  });

  // 1.2 Agente de Soporte
  const soporte = await prisma.user.upsert({
    where: { email: 'soporte@stream.com' },
    update: {
      nombre: 'Soporte Técnico',
      passwordHash: passwordSoporte,
      rol: UserRole.SOPORTE,
      activo: true,
    },
    create: {
      email: 'soporte@stream.com',
      nombre: 'Soporte Técnico',
      passwordHash: passwordSoporte,
      phone: '+573000000002',
      rol: UserRole.SOPORTE,
      activo: true,
    },
  });

  // 1.3 Vendedor / Afiliado
  const vendedor = await prisma.user.upsert({
    where: { email: 'vendedor@stream.com' },
    update: {
      nombre: 'Alejandro Revendedor',
      passwordHash: passwordVendedor,
      rol: UserRole.VENDEDOR,
      activo: true,
    },
    create: {
      email: 'vendedor@stream.com',
      nombre: 'Alejandro Revendedor',
      passwordHash: passwordVendedor,
      phone: '+573155554433',
      rol: UserRole.VENDEDOR,
      activo: true,
    },
  });

  // Crear o actualizar perfil de afiliado
  await prisma.affiliate.upsert({
    where: { userId: vendedor.id },
    update: {
      walletBalance: 125000,
      rango: 'oro',
    },
    create: {
      userId: vendedor.id,
      codigoReferido: 'STREAMPROMO',
      rango: 'oro',
      walletBalance: 125000,
    },
  });

  // 1.4 Cliente Demo
  const clienteUser = await prisma.user.upsert({
    where: { email: 'cliente.demo@stream.com' },
    update: {
      nombre: 'Juan David Morales',
      passwordHash: passwordCliente,
      rol: UserRole.CLIENTE,
      activo: true,
    },
    create: {
      email: 'cliente.demo@stream.com',
      nombre: 'Juan David Morales',
      passwordHash: passwordCliente,
      phone: '+573109998877',
      rol: UserRole.CLIENTE,
      activo: true,
    },
  });

  const cliente = await prisma.customer.upsert({
    where: { userId: clienteUser.id },
    update: {
      whatsapp: '+573109998877',
      pais: 'Colombia',
    },
    create: {
      userId: clienteUser.id,
      whatsapp: '+573109998877',
      pais: 'Colombia',
    },
  });

  // =========================================================================
  // 2. CONFIGURACIÓN DE WHATSAPP
  // =========================================================================
  console.log('📱 Configurando WhatsApp CRM...');
  const whatsappConfig = await prisma.whatsappConfig.findFirst();
  if (!whatsappConfig) {
    await prisma.whatsappConfig.create({
      data: {
        nombreConfig: 'WhatsApp Principal',
        zonaHoraria: 'America/Bogota',
        horaInicio: '08:00:00',
        horaFin: '21:00:00',
        notificacionesActivas: true,
        plantillaEntrega: `¡Hola {nombre_cliente}! 🎉 Gracias por tu compra en StreamControl.\n\nAquí tienes los datos de tu suscripción:\n{lista_cuentas}\n\n⚠️ *REGLAS:* No cambiar correo ni contraseña. Disfruta tu contenido 🍿`,
        plantillaRecordatorio7d: `¡Hola {nombre_cliente}! 👋 Tu suscripción a *{servicio}* vence el próximo *{fecha_vencimiento}* (en 7 días). Renueva aquí para no perder tu perfil: {link_renovacion}`,
        plantillaRecordatorio1d: `⚠️ *AVISO StreamControl* ⚠️ Tu cuenta de *{servicio}* vence HOY. Evita el corte renovando aquí: {link_renovacion}`,
        plantillaRecuperacion3d: `Hola {nombre_cliente}, tu servicio de *{servicio}* venció hace 3 días. ¿Deseas recuperarlo con descuento especial?: {link_renovacion}`,
      },
    });
  }

  // =========================================================================
  // 3. PROVEEDORES Y LOTES
  // =========================================================================
  console.log('📦 Creando lote de proveedor...');
  let batch = await prisma.supplierBatch.findFirst({
    where: { proveedorNombre: 'Global Streaming Wholesale LLC' },
  });

  if (!batch) {
    batch = await prisma.supplierBatch.create({
      data: {
        proveedorNombre: 'Global Streaming Wholesale LLC',
        fechaCompra: new Date(),
        costoTotalLote: 450000,
        cantidadCuentas: 30,
        tasaFalloActual: 0,
        estadoLote: 'activo',
      },
    });
  }

  // =========================================================================
  // 4. CATÁLOGO DE SERVICIOS Y PLANES
  // =========================================================================
  console.log('🎬 Creando plataformas y planes de streaming...');

  const serviciosData = [
    {
      nombre: 'Netflix',
      logoUrl: 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2016.png',
      descripcion: 'Películas, series originales y documentales galardonados en resolución 4K HDR.',
      planes: [
        {
          nombrePlan: '1 Perfil Privado 4K UHD',
          precio: 14000,
          resolucion: '4K UHD',
          pantallasSimultaneas: 1,
          duracionDias: 30,
          garantiaDias: 30,
          cuentas: [
            { email: 'netflx.premium01@strmhub.net', pass: 'Nflx2026*Alpha', perfil: 'Perfil 2', pin: '4488' },
            { email: 'netflx.premium02@strmhub.net', pass: 'Nflx2026*Beta', perfil: 'Perfil 3', pin: '1904' },
            { email: 'netflx.premium03@strmhub.net', pass: 'Nflx2026*Gamma', perfil: 'Perfil 4', pin: '8821' },
          ],
        },
        {
          nombrePlan: 'Cuenta Completa 4 Pantallas',
          precio: 42000,
          resolucion: '4K UHD',
          pantallasSimultaneas: 4,
          duracionDias: 30,
          garantiaDias: 30,
          cuentas: [
            { email: 'netflx.full01@strmhub.net', pass: 'NflxFull#9921', perfil: 'Cuenta Completa (4 Perfiles)', pin: '0000' },
            { email: 'netflx.full02@strmhub.net', pass: 'NflxFull#5512', perfil: 'Cuenta Completa (4 Perfiles)', pin: '0000' },
          ],
        },
      ],
    },
    {
      nombre: 'Disney+',
      logoUrl: 'https://static-assets.bamgrid.com/product/disneyplus/images/share-default.14fadd993578b3f1771849400473a216.png',
      descripcion: 'Todo el universo Disney, Pixar, Marvel, Star Wars y deportes en vivo por ESPN.',
      planes: [
        {
          nombrePlan: '1 Perfil Estándar con ESPN',
          precio: 11000,
          resolucion: '1080p FHD',
          pantallasSimultaneas: 1,
          duracionDias: 30,
          garantiaDias: 30,
          cuentas: [
            { email: 'disney.espn01@strmhub.net', pass: 'DsnPlus#2026A', perfil: 'Perfil 1 (Marvel)', pin: '1234' },
            { email: 'disney.espn02@strmhub.net', pass: 'DsnPlus#2026B', perfil: 'Perfil 2 (Pixar)', pin: '5678' },
          ],
        },
        {
          nombrePlan: 'Cuenta Completa Premium 4K',
          precio: 34000,
          resolucion: '4K UHD + IMAX Enhanced',
          pantallasSimultaneas: 4,
          duracionDias: 30,
          garantiaDias: 30,
          cuentas: [
            { email: 'disney.full01@strmhub.net', pass: 'DsnFullMaster#1', perfil: 'Cuenta Completa', pin: null },
          ],
        },
      ],
    },
    {
      nombre: 'Max (HBO)',
      logoUrl: 'https://hbomax-images.warnermediacdn.com/2020-05/square%20social%20logo%20400%20x%20400_0.png',
      descripcion: 'HBO, Warner Bros, Discovery, DC Comics y producciones exclusivas Max Originals.',
      planes: [
        {
          nombrePlan: '1 Perfil Platino 4K',
          precio: 10000,
          resolucion: '4K UHD',
          pantallasSimultaneas: 1,
          duracionDias: 30,
          garantiaDias: 30,
          cuentas: [
            { email: 'max.plat01@strmhub.net', pass: 'MaxPlat*2026X', perfil: 'Perfil 3', pin: '9912' },
            { email: 'max.plat02@strmhub.net', pass: 'MaxPlat*2026Y', perfil: 'Perfil 4', pin: '3301' },
          ],
        },
      ],
    },
    {
      nombre: 'Spotify',
      logoUrl: 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_CMYK_Green.png',
      descripcion: 'Millones de canciones y podcasts sin interrupciones, audio de alta calidad y modo offline.',
      planes: [
        {
          nombrePlan: 'Cuenta Premium 30 Días',
          precio: 8500,
          resolucion: 'Audio 320 kbps Extreme',
          pantallasSimultaneas: 1,
          duracionDias: 30,
          garantiaDias: 30,
          cuentas: [
            { email: 'spot.prem01@strmhub.net', pass: 'SpotMusic#7766', perfil: 'Cuenta Personal', pin: null },
            { email: 'spot.prem02@strmhub.net', pass: 'SpotMusic#8899', perfil: 'Cuenta Personal', pin: null },
          ],
        },
      ],
    },
    {
      nombre: 'Prime Video',
      logoUrl: 'https://m.media-amazon.com/images/G/01/digital/video/web/Logo-min.png',
      descripcion: 'Series exclusivas Amazon Originals, películas taquilleras y envíos con canales premium.',
      planes: [
        {
          nombrePlan: '1 Perfil Privado Prime',
          precio: 9000,
          resolucion: '4K UHD',
          pantallasSimultaneas: 1,
          duracionDias: 30,
          garantiaDias: 30,
          cuentas: [
            { email: 'prime.vid01@strmhub.net', pass: 'PrimeVid#1122', perfil: 'Perfil 2', pin: '7152' },
            { email: 'prime.vid02@strmhub.net', pass: 'PrimeVid#3344', perfil: 'Perfil 3', pin: '8241' },
          ],
        },
      ],
    },
    {
      nombre: 'YouTube Premium',
      logoUrl: 'https://www.gstatic.com/youtube/img/branding/youtubekids/butterfly_icon.png',
      descripcion: 'YouTube sin anuncios, reproducción en segundo plano y suscripción completa a YouTube Music.',
      planes: [
        {
          nombrePlan: 'Plan Individual 30 Días',
          precio: 10000,
          resolucion: '1080p Premium / 4K',
          pantallasSimultaneas: 1,
          duracionDias: 30,
          garantiaDias: 30,
          cuentas: [
            { email: 'yt.prem01@strmhub.net', pass: 'YtPremium#4455', perfil: 'Invitación Familia / Cuenta', pin: null },
          ],
        },
      ],
    },
  ];

  for (const sData of serviciosData) {
    const service = await prisma.service.upsert({
      where: { nombre: sData.nombre },
      update: {
        logoUrl: sData.logoUrl,
        descripcion: sData.descripcion,
        activo: true,
      },
      create: {
        nombre: sData.nombre,
        logoUrl: sData.logoUrl,
        descripcion: sData.descripcion,
        activo: true,
      },
    });

    for (const pData of sData.planes) {
      let plan = await prisma.plan.findFirst({
        where: {
          serviceId: service.id,
          nombrePlan: pData.nombrePlan,
        },
      });

      if (!plan) {
        plan = await prisma.plan.create({
          data: {
            serviceId: service.id,
            nombrePlan: pData.nombrePlan,
            precio: pData.precio,
            resolucion: pData.resolucion,
            pantallasSimultaneas: pData.pantallasSimultaneas,
            duracionDias: pData.duracionDias,
            garantiaDias: pData.garantiaDias,
            activo: true,
          },
        });
      }

      // Cargar cuentas en inventario
      for (const cData of pData.cuentas) {
        await prisma.account.upsert({
          where: {
            planId_emailCuenta: {
              planId: plan.id,
              emailCuenta: cData.email,
            },
          },
          update: {
            passwordCuenta: cData.pass,
            perfilAsignado: cData.perfil,
            pinPerfil: cData.pin,
            estado: AccountStatus.DISPONIBLE,
            batchId: batch.id,
          },
          create: {
            planId: plan.id,
            emailCuenta: cData.email,
            passwordCuenta: cData.pass,
            perfilAsignado: cData.perfil,
            pinPerfil: cData.pin,
            estado: AccountStatus.DISPONIBLE,
            batchId: batch.id,
          },
        });
      }
    }
  }

  // =========================================================================
  // 5. SUSCRIPCIÓN ACTIVA DEMO PARA EL CLIENTE
  // =========================================================================
  console.log('💳 Asignando suscripción demo al cliente...');

  const netflixPlan = await prisma.plan.findFirst({
    where: { nombrePlan: '1 Perfil Privado 4K UHD' },
  });

  if (netflixPlan) {
    // Buscar una cuenta para asignarla
    const cuentaParaAsignar = await prisma.account.findFirst({
      where: { planId: netflixPlan.id, estado: AccountStatus.DISPONIBLE },
    });

    if (cuentaParaAsignar) {
      // Verificar si el cliente ya tiene suscripción
      const existingSub = await prisma.subscription.findFirst({
        where: { customerId: cliente.id },
      });

      if (!existingSub) {
        const fechaInicio = new Date();
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 27); // Vence en 27 días

        // 1. Crear Orden de compra
        const orden = await prisma.order.create({
          data: {
            customerId: cliente.id,
            total: netflixPlan.precio,
            estado: OrderStatus.PAGADO,
            metodoPago: 'Nequi / Transferencia Bancaria',
            items: {
              create: {
                planId: netflixPlan.id,
                cantidad: 1,
                precioUnitario: netflixPlan.precio,
                subtotal: netflixPlan.precio,
              },
            },
          },
        });

        // 2. Crear Suscripción y marcar cuenta como OCUPADA
        await prisma.subscription.create({
          data: {
            customerId: cliente.id,
            planId: netflixPlan.id,
            accountId: cuentaParaAsignar.id,
            fechaInicio,
            fechaVencimiento,
            estado: SubscriptionStatus.ACTIVA,
          },
        });

        await prisma.account.update({
          where: { id: cuentaParaAsignar.id },
          data: { estado: AccountStatus.OCUPADA },
        });

        console.log(`✅ Suscripción asignada a ${clienteUser.nombre}: Netflix 1 Perfil 4K.`);
      }
    }
  }

  console.log('\n🎉 ¡SEED COMPLETADO EXITOSAMENTE!');
  console.log('=============================================');
  console.log('USUARIOS LISTOS PARA INICIAR SESIÓN:');
  console.log('👑 Admin:     admin@stream.com        / admin123');
  console.log('🛠️ Soporte:   soporte@stream.com      / soporte123');
  console.log('💼 Vendedor:  vendedor@stream.com     / vendedor123');
  console.log('👤 Cliente:   cliente.demo@stream.com / cliente123');
  console.log('=============================================');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
