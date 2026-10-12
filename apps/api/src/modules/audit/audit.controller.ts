import { Controller, Get, Query, UseGuards, ForbiddenException, Res } from '@nestjs/common';
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

  @Get('export-csv')
  @ApiOperation({ summary: 'Esportazione registro di audit in formato CSV (RFC 4180)' })
  async exportCsv(
    @CurrentUser('schoolId') schoolId: string,
    @Query() filters: AuditQueryFilters,
    @Res() res: { setHeader: (k: string, v: string) => void; send: (b: string) => void },
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    const csv = await this.service.exportCsv(schoolId, filters);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csv);
  }
}
