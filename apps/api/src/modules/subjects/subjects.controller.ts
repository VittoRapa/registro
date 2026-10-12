import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Subjects')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly service: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Elenco materie della scuola' })
  async list(@CurrentUser('schoolId') schoolId: string) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.list(schoolId);
  }

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crea nuova materia' })
  async create(
    @CurrentUser('schoolId') schoolId: string,
    @Body() body: { name: string; shortName?: string; color?: string; isGraded?: boolean },
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.create(schoolId, body);
  }

  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifica materia' })
  async update(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; shortName?: string; color?: string; isGraded?: boolean },
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.update(schoolId, id, body);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Elimina materia' })
  async delete(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.delete(schoolId, id);
  }
}
