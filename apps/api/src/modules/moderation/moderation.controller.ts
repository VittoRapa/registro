import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModerationService, ResolveReportDto } from './moderation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NoteReportStatus } from '@prisma/client';
import { Role } from '@registro/shared';

@ApiTags('Moderation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('reports')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Elenco segnalazioni contenuti' })
  async listReports(
    @CurrentUser('schoolId') schoolId: string,
    @Query('status') status?: NoteReportStatus,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.moderationService.listReports(schoolId, status);
  }

  @Post('reports/:id/resolve')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Risoluzione segnalazione e azione sul contenuto' })
  async resolveReport(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') resolvedById: string,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.moderationService.resolveReport(schoolId, id, resolvedById, dto);
  }
}
