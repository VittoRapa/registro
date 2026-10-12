import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  MessagingService,
  CreateConversationDto,
  SendMessageDto,
} from './messaging.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Messaging')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conversations')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Elenco conversazioni utente' })
  async listConversations(@CurrentUser('id') currentUserId: string) {
    return this.messagingService.listConversations(currentUserId);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Crea o recupera conversazione diretta' })
  async createConversation(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: Role,
    @Body() dto: CreateConversationDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola mancante');
    }
    const conversation = await this.messagingService.getOrCreateDirectConversation(
      schoolId,
      currentUserId,
      currentUserRole,
      dto.recipientUserId,
    );

    // If an initial message was provided, send it right away
    if (dto.initialMessage?.trim()) {
      await this.messagingService.sendMessage(conversation.id, currentUserId, {
        body: dto.initialMessage.trim(),
      });
    }

    return conversation;
  }

  @Get(':id/messages')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Messaggi della conversazione' })
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser('id') currentUserId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagingService.getMessages(
      conversationId,
      currentUserId,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Post(':id/messages')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Invia messaggio' })
  async sendMessage(
    @Param('id') conversationId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(conversationId, currentUserId, dto);
  }

  @Delete(':id/messages/:messageId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Elimina messaggio' })
  async deleteMessage(
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: Role,
  ) {
    const isElevated =
      currentUserRole === Role.SUPER_ADMIN || currentUserRole === Role.SCHOOL_ADMIN;
    return this.messagingService.deleteMessage(
      conversationId,
      messageId,
      currentUserId,
      isElevated,
    );
  }
}
