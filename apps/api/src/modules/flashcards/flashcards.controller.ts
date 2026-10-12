import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  FlashcardsService,
  CreateDeckDto,
  CreateCardDto,
  ReviewCardDto,
} from './flashcards.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Flashcards & Spaced Repetition')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('flashcards')
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Get('decks')
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Elenco mazzi di flashcard disponibili per l\'utente' })
  async listDecks(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non presente');
    }
    return this.flashcardsService.listDecks(schoolId, userId);
  }

  @Post('decks')
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crea un nuovo mazzo didattico di flashcard' })
  async createDeck(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDeckDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non presente');
    }
    return this.flashcardsService.createDeck(schoolId, userId, dto);
  }

  @Get('decks/:id')
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Dettagli mazzo e tutte le flashcard' })
  async getDeck(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Param('id') deckId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non presente');
    }
    return this.flashcardsService.getDeck(schoolId, userId, deckId);
  }

  @Post('decks/:id/cards')
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Aggiunge una nuova flashcard a un mazzo esistente' })
  async addCard(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Param('id') deckId: string,
    @Body() dto: CreateCardDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non presente');
    }
    return this.flashcardsService.addCard(schoolId, userId, deckId, dto);
  }

  @Get('decks/:id/due')
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Elenco flashcard in scadenza da ripassare oggi (algoritmo SM-2)' })
  async getDueCards(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Param('id') deckId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non presente');
    }
    return this.flashcardsService.getDueCards(schoolId, userId, deckId);
  }

  @Post('cards/:id/review')
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Invia feedback di studio (voto 0-5) con ricalcolo SuperMemo SM-2' })
  async reviewCard(
    @CurrentUser('id') userId: string,
    @Param('id') cardId: string,
    @Body() dto: ReviewCardDto,
  ) {
    return this.flashcardsService.reviewCard(userId, cardId, dto.grade);
  }
}
