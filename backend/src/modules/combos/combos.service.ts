import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateComboDto, UpdateComboDto } from './dto/combo.dto';
import { toTitleCase } from '../../common/utils/formatters.util';

@Injectable()
export class CombosService {
  constructor(private prisma: PrismaService) {}

  // 1. LISTAR COMBOS ACTIVOS CON DETALLE DE PLANES Y STOCK
  async findAll(onlyActive = true) {
    const where: any = {};
    if (onlyActive) {
      where.activo = true;
    }

    const combos = await this.prisma.combo.findMany({
      where,
      include: {
        items: {
          include: {
            plan: {
              include: {
                service: {
                  select: { id: true, nombre: true, logoUrl: true, usaPin: true },
                },
                accounts: {
                  where: { estado: 'DISPONIBLE' },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return combos.map((c) => {
      const precioComboNum = Number(c.precioCombo);
      let precioRegularTotal = 0;
      let stockComboDisponible = 9999;

      const itemsDetalle = c.items.map((it) => {
        const precioUnitario = Number(it.plan.precio);
        const subtotal = precioUnitario * it.cantidad;
        precioRegularTotal += subtotal;

        const stockDisponible = it.plan.accounts.length;
        const combosPosibles = Math.floor(stockDisponible / it.cantidad);
        if (combosPosibles < stockComboDisponible) {
          stockComboDisponible = combosPosibles;
        }

        return {
          id: it.id,
          planId: it.planId,
          planNombre: it.plan.nombrePlan,
          serviceId: it.plan.service.id,
          serviceNombre: it.plan.service.nombre,
          logoUrl: it.plan.service.logoUrl,
          usaPin: it.plan.usaPin ?? it.plan.service.usaPin,
          resolucion: it.plan.resolucion,
          duracionDias: it.plan.duracionDias,
          cantidad: it.cantidad,
          precioUnitario,
          subtotal,
          stockDisponible,
        };
      });

      if (c.items.length === 0) stockComboDisponible = 0;
      const ahorroValor = Math.max(0, precioRegularTotal - precioComboNum);
      const ahorroPorcentaje =
        precioRegularTotal > 0 ? ((ahorroValor / precioRegularTotal) * 100).toFixed(1) : '0';

      return {
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        precioCombo: precioComboNum,
        precioRegularTotal,
        ahorroValor,
        descuentoPorcentaje: Number(ahorroPorcentaje),
        activo: c.activo,
        stockDisponible: stockComboDisponible,
        items: itemsDetalle,
        createdAt: c.createdAt,
      };
    });
  }

  // 2. OBTENER DETALLE DE UN COMBO
  async findOne(id: string) {
    const combo = await this.prisma.combo.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            plan: {
              include: {
                service: true,
                accounts: {
                  where: { estado: 'DISPONIBLE' },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!combo) {
      throw new NotFoundException(`Combo con ID ${id} no encontrado`);
    }

    const precioComboNum = Number(combo.precioCombo);
    let precioRegularTotal = 0;
    let stockComboDisponible = 9999;

    const itemsDetalle = combo.items.map((it) => {
      const precioUnitario = Number(it.plan.precio);
      const subtotal = precioUnitario * it.cantidad;
      precioRegularTotal += subtotal;

      const stockDisponible = it.plan.accounts.length;
      const combosPosibles = Math.floor(stockDisponible / it.cantidad);
      if (combosPosibles < stockComboDisponible) {
        stockComboDisponible = combosPosibles;
      }

      return {
        id: it.id,
        planId: it.planId,
        planNombre: it.plan.nombrePlan,
        serviceId: it.plan.service.id,
        serviceNombre: it.plan.service.nombre,
        logoUrl: it.plan.service.logoUrl,
        usaPin: it.plan.usaPin ?? it.plan.service.usaPin,
        resolucion: it.plan.resolucion,
        duracionDias: it.plan.duracionDias,
        cantidad: it.cantidad,
        precioUnitario,
        subtotal,
        stockDisponible,
      };
    });

    if (combo.items.length === 0) stockComboDisponible = 0;
    const ahorroValor = Math.max(0, precioRegularTotal - combo.precioCombo.toNumber());
    const ahorroPorcentaje =
      precioRegularTotal > 0 ? ((ahorroValor / precioRegularTotal) * 100).toFixed(1) : '0';

    return {
      id: combo.id,
      nombre: combo.nombre,
      descripcion: combo.descripcion,
      precioCombo: precioComboNum,
      precioRegularTotal,
      ahorroValor,
      descuentoPorcentaje: Number(ahorroPorcentaje),
      activo: combo.activo,
      stockDisponible: stockComboDisponible,
      items: itemsDetalle,
      createdAt: combo.createdAt,
    };
  }

  // 3. CREAR COMBO CON VALIDACIÓN ESTRICTA SRS RF-006 (precioCombo < suma(preciosIndividuales))
  async create(dto: CreateComboDto) {
    if (!dto.items || dto.items.length < 2) {
      throw new BadRequestException(
        'Un combo promocional debe estar compuesto por al menos 2 plataformas o planes diferentes.',
      );
    }

    // Obtener los planes seleccionados
    const planIds = dto.items.map((i) => i.planId);
    const plans = await this.prisma.plan.findMany({
      where: { id: { in: planIds } },
    });

    if (plans.length !== planIds.length) {
      throw new BadRequestException('Uno o más planes especificados no existen en el catálogo.');
    }

    // Calcular la suma de los precios individuales
    let precioRegularTotal = 0;
    dto.items.forEach((item) => {
      const plan = plans.find((p) => p.id === item.planId);
      const cantidad = item.cantidad || 1;
      precioRegularTotal += Number(plan!.precio) * cantidad;
    });

    // Validación de ahorro: precioCombo < suma(preciosIndividuales)
    if (dto.precioCombo >= precioRegularTotal) {
      throw new BadRequestException(
        `El precio del combo promocional ($${dto.precioCombo.toLocaleString(
          'es-CO',
        )}) debe ser estrictamente menor que la suma de sus productos por separado ($${precioRegularTotal.toLocaleString(
          'es-CO',
        )}).`,
      );
    }

    const ahorroValor = precioRegularTotal - dto.precioCombo;
    const descuentoPorcentaje = (ahorroValor / precioRegularTotal) * 100;

    const created = await this.prisma.combo.create({
      data: {
        nombre: toTitleCase(dto.nombre),
        descripcion: dto.descripcion,
        precioCombo: dto.precioCombo,
        descuentoPorcentaje,
        items: {
          create: dto.items.map((it) => ({
            planId: it.planId,
            cantidad: it.cantidad || 1,
          })),
        },
      },
      include: {
        items: {
          include: {
            plan: {
              include: { service: true },
            },
          },
        },
      },
    });

    return created;
  }

  // 4. ACTUALIZAR COMBO
  async update(id: string, dto: UpdateComboDto) {
    const existing = await this.prisma.combo.findUnique({
      where: { id },
      include: { items: { include: { plan: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Combo con ID ${id} no encontrado`);
    }

    let itemsToProcess = existing.items.map((it) => ({
      planId: it.planId,
      cantidad: it.cantidad,
    }));

    if (dto.items && dto.items.length > 0) {
      if (dto.items.length < 2) {
        throw new BadRequestException('Un combo debe incluir al menos 2 productos.');
      }
      itemsToProcess = dto.items.map((it) => ({
        planId: it.planId,
        cantidad: it.cantidad || 1,
      }));
    }

    const planIds = itemsToProcess.map((i) => i.planId);
    const plans = await this.prisma.plan.findMany({
      where: { id: { in: planIds } },
    });

    let precioRegularTotal = 0;
    itemsToProcess.forEach((item) => {
      const plan = plans.find((p) => p.id === item.planId);
      if (plan) {
        precioRegularTotal += Number(plan.precio) * (item.cantidad || 1);
      }
    });

    const targetPrecioCombo = dto.precioCombo !== undefined ? dto.precioCombo : Number(existing.precioCombo);

    if (targetPrecioCombo >= precioRegularTotal) {
      throw new BadRequestException(
        `El precio del combo promocional ($${targetPrecioCombo.toLocaleString(
          'es-CO',
        )}) debe ser estrictamente menor que la suma de sus productos por separado ($${precioRegularTotal.toLocaleString('es-CO')}).`,
      );
    }

    const ahorroValor = precioRegularTotal - targetPrecioCombo;
    const descuentoPorcentaje = (ahorroValor / precioRegularTotal) * 100;

    return this.prisma.$transaction(async (tx) => {
      if (dto.items && dto.items.length > 0) {
        await tx.comboItem.deleteMany({ where: { comboId: id } });
        await tx.comboItem.createMany({
          data: dto.items.map((it) => ({
            comboId: id,
            planId: it.planId,
            cantidad: it.cantidad || 1,
          })),
        });
      }

      return tx.combo.update({
        where: { id },
        data: {
          ...(dto.nombre && { nombre: toTitleCase(dto.nombre) }),
          ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
          ...(dto.precioCombo !== undefined && { precioCombo: dto.precioCombo }),
          ...(dto.activo !== undefined && { activo: dto.activo }),
          descuentoPorcentaje,
        },
        include: {
          items: {
            include: {
              plan: {
                include: { service: true },
              },
            },
          },
        },
      });
    });
  }

  // 5. ELIMINAR / DESACTIVAR COMBO
  async remove(id: string) {
    const existing = await this.prisma.combo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Combo no encontrado');

    return this.prisma.combo.update({
      where: { id },
      data: { activo: false },
    });
  }
}
