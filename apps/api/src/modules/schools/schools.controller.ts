import { Controller, Get, Patch, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolsService, UpdateSchoolDto } from './schools.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Schools')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('school')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  @ApiOperation({ summary: 'Recupera profilo e impostazioni della scuola corrente' })
  async getSchool(@CurrentUser('schoolId') schoolId: string) {
    if (!schoolId) {
      throw new ForbiddenException('Nessuna scuola associata all\'utente corrente');
    }
    return this.schoolsService.getSchool(schoolId);
  }

  @Patch()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Aggiorna impostazioni e profilo della scuola' })
  async updateSchool(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: UpdateSchoolDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Nessuna scuola associata all\'utente corrente');
    }
    return this.schoolsService.updateSchool(schoolId, body, actorUserId);
  }
}
