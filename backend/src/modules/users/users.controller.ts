import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserModulesDto } from './dto/update-user-modules.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // MATRIZ DE ROLES Y PERMISOS
  @Get('roles-matrix')
  getRolesMatrix() {
    return this.usersService.getRolesMatrix();
  }

  // LISTAR USUARIOS INTERNOS
  @Get()
  findAll(
    @Query('rol') rol?: UserRole,
    @Query('includeClients') includeClients?: string,
  ) {
    return this.usersService.findAll(rol, includeClients === 'true');
  }

  // DETALLE DE USUARIO
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // CREAR USUARIO INTERNO (ADMIN, VENDEDOR, SOPORTE)
  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  // ACTUALIZAR USUARIO INTERNO
  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.updateUser(id, dto, currentUser?.id || currentUser?.userId);
  }

  // ACTIVAR / DESACTIVAR MÓDULOS DE UN USUARIO (EXCLUSIVO ADMINISTRADOR)
  @Patch(':id/modules')
  updateUserModules(
    @Param('id') id: string,
    @Body() dto: UpdateUserModulesDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.updateUserModules(id, dto.modulosPermitidos, currentUser?.id || currentUser?.userId);
  }

  // ALTERNAR ESTADO ACTIVO / SUSPENDIDO
  @Patch(':id/toggle-active')
  toggleActive(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.toggleActive(id, currentUser?.id || currentUser?.userId);
  }

  // ELIMINAR USUARIO INTERNO
  @Delete(':id')
  deleteUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.deleteUser(id, currentUser?.id || currentUser?.userId);
  }
}
