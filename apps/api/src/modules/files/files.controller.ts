import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService, RequestUploadUrlDto } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Files')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Richiesta URL pre-firmato per upload sicuro su storage S3/MinIO' })
  async requestUploadUrl(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: RequestUploadUrlDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.filesService.requestUploadUrl(schoolId, ownerId, dto);
  }

  @Post(':id/complete')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Conferma completamento upload e avvio verifica di sicurezza' })
  async completeUpload(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') ownerId: string,
    @Param('id') fileId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.filesService.completeUpload(schoolId, ownerId, fileId);
  }

  @Get(':id/download')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Generazione URL temporaneo di download con Content-Disposition' })
  async getDownloadUrl(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') fileId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.filesService.getDownloadUrl(schoolId, fileId);
  }

  @Get(':id/preview')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Generazione URL di anteprima per visualizzatore PDF / Immagine' })
  async getPreviewUrl(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') fileId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.filesService.getPreviewUrl(schoolId, fileId);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Eliminazione file caricato' })
  async deleteFile(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') fileId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    const isElevated = role === Role.SCHOOL_ADMIN || role === Role.SUPER_ADMIN;
    return this.filesService.deleteFile(schoolId, userId, fileId, isElevated);
  }
}
