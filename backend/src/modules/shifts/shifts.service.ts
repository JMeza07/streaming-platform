import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateShiftMovementDto } from './dto/create-movement.dto';
import { ShiftStatus, AuditCategory, AuditSeverity, OrderStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // =========================================================================
  // APERTURA DE TURNO (SRS RF-022)
  // =========================================================================
  async openShift(userId: string, userName: string, dto: OpenShiftDto) {
    // 1. Verificar si el usuario ya tiene un turno abierto
    const existingOpen = await this.prisma.shiftReport.findFirst({
      where: {
        asesorId: userId,
        estado: ShiftStatus.ABIERTO,
      },
      include: {
        movements: true,
      },
    });

    if (existingOpen) {
      throw new ConflictException('Ya tienes un turno de caja abierto actualmente.');
    }

    const baseInicial = Number(dto.baseInicial || 0);

    const shift = await this.prisma.shiftReport.create({
      data: {
        asesorId: userId,
        asesorNombre: userName,
        fechaTurno: new Date(),
        horaInicio: new Date(),
        baseInicial,
        saldoEsperado: baseInicial,
        estado: ShiftStatus.ABIERTO,
        observaciones: dto.observaciones || null,
        metrics: {
          ventasPorMedioPago: {},
          ordenesProcesadas: 0,
        },
      },
      include: {
        asesor: { select: { id: true, nombre: true, email: true, rol: true } },
        movements: true,
      },
    });

    await this.auditService.registrarEvento({
      usuarioId: userId,
      usuarioNombre: userName,
      modulo: AuditCategory.CAJA,
      accion: 'APERTURA_TURNO',
      severidad: AuditSeverity.INFO,
      descripcion: `Turno de caja abierto por ${userName}. Base inicial: $${baseInicial.toLocaleString('es-CO')}`,
      entidadTipo: 'ShiftReport',
      entidadId: shift.id,
      detalles: {
        shiftId: shift.id,
        baseInicial,
      },
    });

    return {
      message: 'Turno abierto exitosamente.',
      shift,
    };
  }

  // =========================================================================
  // OBTENER TURNO ACTIVO
  // =========================================================================
  async getCurrentShift(userId: string, role?: string) {
    const shift = await this.prisma.shiftReport.findFirst({
      where: {
        ...(role === 'ADMIN' ? {} : { asesorId: userId }),
        estado: ShiftStatus.ABIERTO,
      },
      include: {
        asesor: { select: { id: true, nombre: true, email: true, rol: true } },
        movements: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!shift) {
      return {
        abierto: false,
        shift: null,
      };
    }

    // Calcular ventas directas registradas por este asesor durante este turno
    const ordersInShift = await this.prisma.order.findMany({
      where: {
        vendedorId: shift.asesorId,
        estado: OrderStatus.PAGADO,
        createdAt: { gte: shift.horaInicio },
      },
      select: {
        id: true,
        total: true,
        metodoPago: true,
        clase: true,
        banco: true,
        vendedorComision: true,
        createdAt: true,
      },
    });

    const ventasPorMedio: Record<string, number> = {};
    let totalVentasSistema = 0;

    for (const ord of ordersInShift) {
      const medio = ord.metodoPago || ord.banco || 'OTROS';
      const monto = Number(ord.total || 0);
      ventasPorMedio[medio] = (ventasPorMedio[medio] || 0) + monto;
      totalVentasSistema += monto;
    }

    // Recalcular balance en vivo
    const base = Number(shift.baseInicial);
    const entradasManuales = Number(shift.totalEntradas);
    const gastos = Number(shift.totalGastos);
    const saldoEsperadoEnVivo = base + totalVentasSistema + entradasManuales - gastos;

    return {
      abierto: true,
      shift: {
        ...shift,
        totalVentas: totalVentasSistema,
        saldoEsperado: saldoEsperadoEnVivo,
        metrics: {
          ventasPorMedioPago: ventasPorMedio,
          ordenesProcesadas: ordersInShift.length,
        },
      },
      ordersCount: ordersInShift.length,
      orders: ordersInShift,
    };
  }

  // =========================================================================
  // REGISTRAR MOVIMIENTO DE CAJA (ENTRADA / SALIDA / GASTO)
  // =========================================================================
  async createMovement(shiftId: string, userId: string, userName: string, dto: CreateShiftMovementDto) {
    const shift = await this.prisma.shiftReport.findUnique({
      where: { id: shiftId },
    });

    if (!shift) throw new NotFoundException('Turno no encontrado');
    if (shift.estado === ShiftStatus.CERRADO) {
      throw new BadRequestException('No se pueden agregar movimientos a un turno ya cerrado.');
    }

    const monto = Number(dto.monto);
    const esEntrada = dto.tipo === 'ENTRADA' || dto.tipo === 'VENTA_SISTEMA';

    const movement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shiftMovement.create({
        data: {
          shiftId,
          tipo: dto.tipo,
          concepto: dto.concepto,
          monto,
          metodoPago: dto.metodoPago || null,
          orderId: dto.orderId || null,
          operadorId: userId,
          operadorNombre: userName,
          observaciones: dto.observaciones || null,
        },
      });

      if (esEntrada) {
        await tx.shiftReport.update({
          where: { id: shiftId },
          data: {
            totalEntradas: { increment: monto },
            saldoEsperado: { increment: monto },
          },
        });
      } else {
        await tx.shiftReport.update({
          where: { id: shiftId },
          data: {
            totalGastos: { increment: monto },
            saldoEsperado: { decrement: monto },
          },
        });
      }

      return created;
    });

    await this.auditService.registrarEvento({
      usuarioId: userId,
      usuarioNombre: userName,
      modulo: AuditCategory.CAJA,
      accion: 'MOVIMIENTO_CAJA',
      severidad: dto.tipo === 'GASTO' ? AuditSeverity.WARNING : AuditSeverity.INFO,
      descripcion: `Movimiento de caja [${dto.tipo}] por $${monto.toLocaleString('es-CO')}: ${dto.concepto}`,
      entidadTipo: 'ShiftMovement',
      entidadId: movement.id,
      detalles: {
        shiftId,
        tipo: dto.tipo,
        monto,
        concepto: dto.concepto,
      },
    });

    return {
      message: 'Movimiento registrado exitosamente.',
      movement,
    };
  }

  // =========================================================================
  // CIERRE DE TURNO Y ARQUEO (SRS RF-022 / F1.8)
  // =========================================================================
  async closeShift(shiftId: string, userId: string, userName: string, dto: CloseShiftDto) {
    const shift = await this.prisma.shiftReport.findUnique({
      where: { id: shiftId },
      include: {
        movements: true,
      },
    });

    if (!shift) throw new NotFoundException('Turno no encontrado');
    if (shift.estado === ShiftStatus.CERRADO) {
      throw new BadRequestException('Este turno ya ha sido cerrado previamente.');
    }

    // Calcular ventas del sistema registradas durante el turno
    const ordersInShift = await this.prisma.order.findMany({
      where: {
        vendedorId: shift.asesorId,
        estado: OrderStatus.PAGADO,
        createdAt: { gte: shift.horaInicio },
      },
    });

    const ventasPorMedio: Record<string, number> = {};
    let totalVentasSistema = 0;

    for (const ord of ordersInShift) {
      const medio = ord.metodoPago || ord.banco || 'OTROS';
      const m = Number(ord.total || 0);
      ventasPorMedio[medio] = (ventasPorMedio[medio] || 0) + m;
      totalVentasSistema += m;
    }

    const base = Number(shift.baseInicial);
    const entradasManuales = Number(shift.totalEntradas);
    const gastos = Number(shift.totalGastos);
    const saldoEsperadoFinal = base + totalVentasSistema + entradasManuales - gastos;
    const saldoReal = Number(dto.saldoReal);
    const diferencia = saldoReal - saldoEsperadoFinal;

    const closedShift = await this.prisma.shiftReport.update({
      where: { id: shiftId },
      data: {
        horaFin: new Date(),
        totalVentas: totalVentasSistema,
        saldoEsperado: saldoEsperadoFinal,
        saldoReal,
        diferencia,
        estado: ShiftStatus.CERRADO,
        novedades: dto.novedades || null,
        observaciones: dto.observaciones || shift.observaciones,
        metrics: {
          ventasPorMedioPago: ventasPorMedio,
          ordenesProcesadas: ordersInShift.length,
        },
      },
      include: {
        asesor: { select: { id: true, nombre: true, email: true, rol: true } },
        movements: true,
      },
    });

    await this.auditService.registrarEvento({
      usuarioId: userId,
      usuarioNombre: userName,
      modulo: AuditCategory.CAJA,
      accion: 'CIERRE_TURNO',
      severidad: Math.abs(diferencia) > 0 ? AuditSeverity.WARNING : AuditSeverity.SUCCESS,
      descripcion: `Turno cerrado por ${userName}. Esperado: $${saldoEsperadoFinal.toLocaleString('es-CO')} | Real: $${saldoReal.toLocaleString('es-CO')} | Dif: $${diferencia.toLocaleString('es-CO')}`,
      entidadTipo: 'ShiftReport',
      entidadId: shift.id,
      detalles: {
        shiftId,
        saldoEsperado: saldoEsperadoFinal,
        saldoReal,
        diferencia,
        novedades: dto.novedades,
      },
    });

    return {
      message: 'Turno cerrado y arqueo registrado exitosamente.',
      shift: closedShift,
      resumen: {
        baseInicial: base,
        totalVentas: totalVentasSistema,
        totalGastos: gastos,
        saldoEsperado: saldoEsperadoFinal,
        saldoReal,
        diferencia,
        cuadre: diferencia === 0 ? 'EXACTO' : diferencia > 0 ? 'SOBRANTE' : 'FALTANTE',
      },
    };
  }

  // =========================================================================
  // HISTORIAL DE REPORTES DE TURNO
  // =========================================================================
  async getShiftHistory(filters: {
    asesorId?: string;
    fechaInicio?: string;
    fechaFin?: string;
    estado?: ShiftStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 30);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.asesorId) where.asesorId = filters.asesorId;
    if (filters.estado) where.estado = filters.estado;
    if (filters.fechaInicio || filters.fechaFin) {
      where.fechaTurno = {
        ...(filters.fechaInicio && { gte: new Date(filters.fechaInicio) }),
        ...(filters.fechaFin && { lte: new Date(filters.fechaFin) }),
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.shiftReport.count({ where }),
      this.prisma.shiftReport.findMany({
        where,
        include: {
          asesor: { select: { id: true, nombre: true, email: true, rol: true } },
          _count: { select: { movements: true } },
        },
        orderBy: { fechaTurno: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async getShiftById(id: string) {
    const shift = await this.prisma.shiftReport.findUnique({
      where: { id },
      include: {
        asesor: { select: { id: true, nombre: true, email: true, rol: true } },
        movements: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!shift) throw new NotFoundException('Reporte de turno no encontrado');
    return shift;
  }
}
