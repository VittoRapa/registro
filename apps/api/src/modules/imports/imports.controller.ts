import {
  Controller,
  Post,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Imports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
@Controller('imports')
export class ImportsController {
  constructor(private readonly service: ImportsService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Anteprima e validazione dry-run di file CSV' })
  async preview(
    @CurrentUser('schoolId') schoolId: string,
    @Body('type') type: 'STUDENTS' | 'TEACHERS',
    @Body('csv') csv: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.dryRun(schoolId, type, csv);
  }

  @Post('execute')
  @ApiOperation({ summary: 'Esecuzione effettiva dell\'importazione CSV con creazione utenti e classi' })
  async execute(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Body('type') type: 'STUDENTS' | 'TEACHERS',
    @Body('csv') csv: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.executeImport(schoolId, type, csv, actorUserId);
  }
}
