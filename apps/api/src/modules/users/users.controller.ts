import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService, CreateUserDto, UpdateUserDto, UserQueryFilters } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ricerca utenti per ruolo, classe, stato con paginazione' })
  async listUsers(
    @CurrentUser('schoolId') schoolId: string,
    @Query() filters: UserQueryFilters,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.usersService.listUsers(schoolId, filters);
  }

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Creazione singolo utente (studente, docente, genitore)' })
  async createUser(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: CreateUserDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.usersService.createUser(schoolId, dto, actorUserId);
  }

  @Get(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Dettagli anagrafica utente' })
  async getUser(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.usersService.getUser(schoolId, id);
  }

  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Aggiornamento anagrafica utente' })
  async updateUser(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.usersService.updateUser(schoolId, id, body, actorUserId);
  }

  @Post(':id/suspend')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Sospensione utente e revoca immediata delle sessioni' })
  async suspendUser(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.usersService.suspendUser(schoolId, id, actorUserId);
  }

  @Post(':id/reactivate')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Riattivazione utente sospeso' })
  async reactivateUser(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.usersService.reactivateUser(schoolId, id, actorUserId);
  }

  @Post(':id/reset-password')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generazione nuova password temporanea da parte dell\'amministratore' })
  async adminResetPassword(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.usersService.adminResetPassword(schoolId, id, actorUserId);
  }

  @Post(':id/reset-2fa')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Azzeramento 2FA dell\'utente (dopo verifica identità fisica)' })
  async adminReset2fa(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.usersService.adminReset2fa(schoolId, id, actorUserId);
  }

  @Post(':id/revoke-sessions')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoca forzata di tutte le sessioni attive dell\'utente' })
  async forceLogout(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.usersService.forceLogout(schoolId, id, actorUserId);
  }

  @Post(':id/anonymize')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Anonimizzazione irreversibile dei dati personali (Diritto all\'oblio GDPR)' })
  async anonymizeUser(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.usersService.anonymizeUser(schoolId, id, actorUserId);
  }
}
