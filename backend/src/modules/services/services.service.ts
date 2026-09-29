import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    return this.prisma.service.create({ data: dto });
  }

  async findAll() {
    const services = await this.prisma.service.findMany({
      where: { activo: true },
      include: {
        plans: {
          where: { activo: true },
          include: {
            accounts: {
              where: { estado: 'DISPONIBLE' },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services.map((s) => ({
      ...s,
      plans: s.plans.map((p) => ({
        ...p,
        stockDisponible: p.accounts.length,
      })),
      stockDisponibleTotal: s.plans.reduce((sum, p) => sum + p.accounts.length, 0),
    }));
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        plans: {
          include: {
            accounts: {
              where: { estado: 'DISPONIBLE' },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!service) throw new NotFoundException('Plataforma no encontrada');
    return {
      ...service,
      plans: service.plans.map((p) => ({
        ...p,
        stockDisponible: p.accounts.length,
      })),
      stockDisponibleTotal: service.plans.reduce((sum, p) => sum + p.accounts.length, 0),
    };
  }

  async update(id: string, dto: Partial<CreateServiceDto>) {
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.service.update({
      where: { id },
      data: { activo: false }, // Soft delete
    });
  }
}