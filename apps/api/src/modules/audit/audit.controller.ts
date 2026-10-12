import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService, AuditQueryFilters } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Audit')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Consultazione registro di audit immutabile (log accessi e modifiche)' })
  async list(
    @CurrentUser('schoolId') schoolId: string,
    @Query() filters: AuditQueryFilters,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.list(schoolId, filters);
  }
}
