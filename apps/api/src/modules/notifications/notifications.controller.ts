import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  NotificationsService,
  UpdatePreferenceDto,
} from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Elenco notifiche in-app' })
  async listNotifications(
    @CurrentUser('id') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.listNotifications(userId, unreadOnly === 'true');
  }

  @Post(':id/read')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Segna notifica come letta' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Post('read-all')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Segna tutte le notifiche come lette' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Get('preferences')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Preferenze canali di notifica' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Put('preferences')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Aggiorna preferenza canale di notifica' })
  async updatePreference(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferenceDto,
  ) {
    return this.notificationsService.updatePreference(userId, dto);
  }
}
