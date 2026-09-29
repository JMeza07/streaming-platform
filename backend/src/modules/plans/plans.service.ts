import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service) throw new NotFoundException('Servicio no encontrado');

    return this.prisma.plan.create({
      data: {
        ...dto,
        precio: dto.precio,
      },
      include: { service: true },
    });
  }

  async findAll() {
    const plans = await this.prisma.plan.findMany({
      where: { activo: true },
      include: {
        service: true,
        accounts: {
          where: { estado: 'DISPONIBLE' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plans.map((p) => ({
      ...p,
      stockDisponible: p.accounts.length,
    }));
  }

  async findByService(serviceId: string) {
    const plans = await this.prisma.plan.findMany({
      where: { serviceId, activo: true },
      include: {
        service: true,
        accounts: {
          where: { estado: 'DISPONIBLE' },
          select: { id: true },
        },
      },
    });

    return plans.map((p) => ({
      ...p,
      stockDisponible: p.accounts.length,
    }));
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        service: true,
        accounts: {
          where: { estado: 'DISPONIBLE' },
          select: { id: true },
        },
      },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return {
      ...plan,
      stockDisponible: plan.accounts.length,
    };
  }

  async update(id: string, dto: Partial<CreatePlanDto>) {
    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.plan.update({
      where: { id },
      data: { activo: false },
    });
  }
}