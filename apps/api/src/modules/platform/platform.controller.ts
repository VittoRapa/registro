import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformService, CreateSchoolDto } from './platform.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Platform')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('schools')
  @ApiOperation({ summary: 'Elenco istituti scolastici registrati sulla piattaforma' })
  async listSchools() {
    return this.platformService.listSchools();
  }

  @Get('schools/:id')
  @ApiOperation({ summary: 'Dettagli singolo istituto' })
  async getSchool(@Param('id') id: string) {
    return this.platformService.getSchool(id);
  }

  @Post('schools')
  @ApiOperation({ summary: 'Creazione nuovo istituto scolastico e amministratore' })
  async createSchool(
    @Body() dto: CreateSchoolDto,
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.platformService.createSchool(dto, actorUserId);
  }

  @Patch('schools/:id/status')
  @ApiOperation({ summary: 'Sospensione o riattivazione istituto' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'SUSPENDED',
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.platformService.updateSchoolStatus(id, status, actorUserId);
  }
}
