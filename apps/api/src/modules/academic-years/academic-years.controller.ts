import { Controller, Get, Post, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicYearsService } from './academic-years.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('AcademicYears')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly service: AcademicYearsService) {}

  @Get()
  @ApiOperation({ summary: 'Elenco anni scolastici e periodi' })
  async list(@CurrentUser('schoolId') schoolId: string) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.list(schoolId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Anno scolastico corrente' })
  async getCurrent(@CurrentUser('schoolId') schoolId: string) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.getCurrent(schoolId);
  }

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crea nuovo anno scolastico' })
  async create(
    @CurrentUser('schoolId') schoolId: string,
    @Body() body: { name: string; startDate: string; endDate: string; isCurrent?: boolean },
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.create(schoolId, body);
  }

  @Post(':id/terms')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Aggiunge un periodo (es. Primo Quadrimestre) all\'anno scolastico' })
  async addTerm(
    @Param('id') id: string,
    @Body() body: { name: string; startDate: string; endDate: string; order: number },
  ) {
    return this.service.addTerm(id, body);
  }
}
