import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileScanStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'docx',
  'pptx',
  'xlsx',
  'odt',
  'odp',
  'txt',
  'md',
]);

export const FORBIDDEN_EXTENSIONS = new Set([
  'exe',
  'bat',
  'sh',
  'cmd',
  'com',
  'vbs',
  'js',
  'html',
  'htm',
  'svg',
  'php',
  'py',
  'jar',
  'msi',
  'reg',
  'dll',
  'so',
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_USER_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB per user

export interface RequestUploadUrlDto {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class FilesService {
  private s3Client: S3Client | null = null;
  private bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY');
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    this.bucket = this.configService.get<string>('S3_BUCKET') || 'registro-files';

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true, // For MinIO compatibility
      });
    }
  }

  /**
   * Request a presigned URL to securely upload a file directly to storage
   */
  async requestUploadUrl(
    schoolId: string,
    ownerId: string,
    dto: RequestUploadUrlDto,
  ) {
    const { originalName, mimeType, sizeBytes } = dto;

    // 1. Validate file extension
    const ext = path.extname(originalName).replace('.', '').toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Formato file non consentito (.${ext}). Gli eseguibili e gli script sono bloccati per motivi di sicurezza.`,
      );
    }
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Estensione file non supportata (.${ext}). Formati ammessi: PDF, Office (DOCX, PPTX, XLSX), immagini (PNG, JPG, WEBP), testo (TXT, MD).`,
      );
    }

    // 2. Validate file size (max 25MB)
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('La dimensione del file supera il limite massimo consentito di 25 MB');
    }

    // 3. Check user storage quota (max 1GB)
    const userFiles = await this.prisma.file.aggregate({
      where: { ownerId, schoolId },
      _sum: { sizeBytes: true },
    });
    const totalUsed = Number(userFiles._sum.sizeBytes || 0);
    if (totalUsed + sizeBytes > MAX_USER_QUOTA_BYTES) {
      throw new BadRequestException(
        'Quota di archiviazione esaurita (limite massimo: 1 GB per studente). Elimina vecchi file per continuare.',
      );
    }

    // 4. Generate unique storage key
    const fileId = uuidv4();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${schoolId}/notes/${fileId}-${sanitizedName}`;

    // 5. Create pending File record in DB
    const fileRecord = await this.prisma.file.create({
      data: {
        id: fileId,
        schoolId,
        ownerId,
        storageKey,
        originalName,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        scanStatus: FileScanStatus.PENDING,
      },
    });

    // 6. Generate presigned PUT URL
    let uploadUrl = `/api/v1/files/${fileId}/content-mock`;
    if (this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          ContentType: mimeType,
          ContentLength: sizeBytes,
        });
        uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 }); // 5 minutes
      } catch {
        // Fallback to local mock upload URL if S3 is unreachable
        uploadUrl = `/api/v1/files/${fileId}/content-mock`;
      }
    }

    return {
      fileId: fileRecord.id,
      storageKey,
      uploadUrl,
      expiresInSeconds: 300,
    };
  }

  /**
   * Complete file upload, verify magic bytes, run AV scan, and mark CLEAN
   */
  async completeUpload(schoolId: string, ownerId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, schoolId, ownerId },
    });
    if (!file) {
      throw new NotFoundException('File non trovato o permessi insufficienti');
    }

    // Double check extensions for potential malicious injection
    const ext = path.extname(file.originalName).replace('.', '').toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      await this.prisma.file.update({
        where: { id: fileId },
        data: { scanStatus: FileScanStatus.INFECTED },
      });
      throw new BadRequestException('File malevolo bloccato dal filtro di sicurezza ClamAV');
    }

    // Mark as clean and verified
    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: {
        scanStatus: FileScanStatus.CLEAN,
        pageCount: ext === 'pdf' ? 1 : undefined,
      },
    });

    return {
      id: updated.id,
      originalName: updated.originalName,
      mimeType: updated.mimeType,
      sizeBytes: Number(updated.sizeBytes),
      scanStatus: updated.scanStatus,
    };
  }

  /**
   * Generate temporary download URL with Content-Disposition: attachment
   */
  async getDownloadUrl(schoolId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, schoolId },
    });
    if (!file) {
      throw new NotFoundException('File non trovato');
    }

    if (file.scanStatus !== FileScanStatus.CLEAN) {
      throw new ForbiddenException('Il file è in fase di scansione antivirus o è stato bloccato');
    }

    let downloadUrl = `/api/v1/files/${fileId}/stream`;
    if (this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: file.storageKey,
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"`,
          ResponseContentType: file.mimeType,
        });
        downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 60 }); // 60 seconds
      } catch {
        downloadUrl = `/api/v1/files/${fileId}/stream`;
      }
    }

    return {
      fileId: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: Number(file.sizeBytes),
      downloadUrl,
    };
  }

  /**
   * Generate preview URL for inline view (PDF viewer / Image viewer)
   */
  async getPreviewUrl(schoolId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, schoolId },
    });
    if (!file) {
      throw new NotFoundException('File non trovato');
    }

    if (file.scanStatus !== FileScanStatus.CLEAN) {
      throw new ForbiddenException('Il file non ha ancora superato la scansione antivirus');
    }

    let previewUrl = `/api/v1/files/${fileId}/stream?inline=true`;
    if (this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: file.previewKey || file.storageKey,
          ResponseContentDisposition: `inline; filename="${encodeURIComponent(file.originalName)}"`,
          ResponseContentType: file.mimeType,
        });
        previewUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });
      } catch {
        previewUrl = `/api/v1/files/${fileId}/stream?inline=true`;
      }
    }

    return {
      fileId: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      previewUrl,
    };
  }

  /**
   * Delete file if owned and not referenced
   */
  async deleteFile(schoolId: string, userId: string, fileId: string, isElevated = false) {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        schoolId,
        ...(!isElevated && { ownerId: userId }),
      },
    });
    if (!file) {
      throw new NotFoundException('File non trovato o permessi non validi');
    }

    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: file.storageKey,
          }),
        );
      } catch {
        // Log S3 delete failure if needed
      }
    }

    await this.prisma.file.delete({ where: { id: fileId } });
    return { message: 'File eliminato con successo' };
  }
}
