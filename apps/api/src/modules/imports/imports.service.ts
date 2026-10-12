import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { Role } from '@registro/shared';
import { parse } from 'csv-parse/sync';

export interface CsvImportRow {
  cognome?: string;
  nome?: string;
  email?: string;
  codice_fiscale?: string;
  data_nascita?: string;
  classe?: string;
  email_genitore_1?: string;
  email_genitore_2?: string;
  materie?: string;
  [key: string]: string | undefined;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  preview: Array<{
    rowNumber: number;
    data: CsvImportRow;
    errors: string[];
    status: 'VALID' | 'ERROR';
  }>;
  errors: Array<{ rowNumber: number; errors: string[] }>;
}

export interface ImportExecuteResult {
  processed: number;
  createdUsers: Array<{
    id: string;
    role: string;
    firstName: string;
    lastName: string;
    username: string;
    email?: string | null;
    temporaryPassword: string;
    class?: string;
  }>;
  createdClasses: string[];
  errors: Array<{ rowNumber: number; error: string }>;
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Parse CSV content with delimiter autodetection (, or ;) and strip BOM
   */
  parseCsv(content: string): CsvImportRow[] {
    const cleanContent = content.replace(/^\uFEFF/, '').trim();
    if (!cleanContent) {
      throw new BadRequestException('Il file CSV è vuoto');
    }

    // Detect delimiter
    const firstLine = cleanContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    try {
      const records = parse(cleanContent, {
        columns: (header: string[]) =>
          header.map((col) =>
            col.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          ),
        delimiter,
        skip_empty_lines: true,
        trim: true,
      });

      return records as CsvImportRow[];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      throw new BadRequestException(`Errore di formattazione CSV: ${message}`);
    }
  }

  /**
   * Dry run / validation of CSV import
   */
  async dryRun(
    _schoolId: string,
    type: 'STUDENTS' | 'TEACHERS',
    csvContent: string,
  ): Promise<ImportPreviewResult> {
    const rows = this.parseCsv(csvContent);
    const previewList: ImportPreviewResult['preview'] = [];
    const errorList: ImportPreviewResult['errors'] = [];

    let validCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const rowErrors: string[] = [];

      if (!row.nome || row.nome.trim().length === 0) {
        rowErrors.push('Nome obbligatorio');
      }
      if (!row.cognome || row.cognome.trim().length === 0) {
        rowErrors.push('Cognome obbligatorio');
      }

      if (type === 'STUDENTS') {
        if (!row.classe || row.classe.trim().length === 0) {
          rowErrors.push('Classe obbligatoria per studenti (es. 1A, 3B)');
        }
      } else if (type === 'TEACHERS') {
        if (!row.email || !row.email.includes('@')) {
          rowErrors.push('Email obbligatoria e valida per docenti');
        }
      }

      if (rowErrors.length > 0) {
        errorCount++;
        errorList.push({ rowNumber: i + 1, errors: rowErrors });
      } else {
        validCount++;
      }

      if (i < 20) {
        previewList.push({
          rowNumber: i + 1,
          data: row,
          errors: rowErrors,
          status: rowErrors.length > 0 ? 'ERROR' : 'VALID',
        });
      }
    }

    return {
      totalRows: rows.length,
      validRows: validCount,
      errorRows: errorCount,
      preview: previewList,
      errors: errorList,
    };
  }

  /**
   * Execute actual CSV import and create users, classes, assignments
   */
  async executeImport(
    schoolId: string,
    type: 'STUDENTS' | 'TEACHERS',
    csvContent: string,
    actorUserId?: string,
  ): Promise<ImportExecuteResult> {
    const rows = this.parseCsv(csvContent);
    const createdUsers: ImportExecuteResult['createdUsers'] = [];
    const createdClassesSet = new Set<string>();
    const executionErrors: ImportExecuteResult['errors'] = [];

    // Get current academic year
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!currentYear) {
      throw new BadRequestException('Nessun anno accademico corrente configurato per la scuola');
    }

    // Process rows sequentially in transaction blocks or per row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const rowNumber = i + 1;

      try {
        if (!row.nome || !row.cognome) {
          executionErrors.push({ rowNumber, error: 'Nome o cognome mancante' });
          continue;
        }

        const firstName = row.nome.trim();
        const lastName = row.cognome.trim();

        // Generate username
        const baseUsername = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        let username = baseUsername;
        let counter = 1;
        while (await this.prisma.user.findUnique({ where: { schoolId_username: { schoolId, username } } })) {
          counter++;
          username = `${baseUsername}${counter}`;
        }

        const tempPassword = this.cryptoService.generateSecureToken(5);
        const passwordHash = await this.cryptoService.hashPassword(tempPassword);

        if (type === 'STUDENTS') {
          const className = row.classe?.trim().toUpperCase();
          if (!className) {
            executionErrors.push({ rowNumber, error: 'Classe non specificata per studente' });
            continue;
          }

          // Find or create class
          let cls = await this.prisma.class.findUnique({
            where: {
              schoolId_academicYearId_name: {
                schoolId,
                academicYearId: currentYear.id,
                name: className,
              },
            },
          });

          if (!cls) {
            const gradeNum = parseInt(className.replace(/\D/g, ''), 10) || 1;
            const sectionLetter = className.replace(/\d/g, '').trim() || 'A';

            cls = await this.prisma.class.create({
              data: {
                schoolId,
                academicYearId: currentYear.id,
                name: className,
                grade: gradeNum,
                section: sectionLetter,
              },
            });
            createdClassesSet.add(className);
          }

          const birthDate = row.data_nascita ? new Date(row.data_nascita) : null;
          const fiscalCode = row.codice_fiscale
            ? this.cryptoService.encrypt(row.codice_fiscale.toUpperCase())
            : null;

          const studentUser = await this.prisma.user.create({
            data: {
              schoolId,
              role: Role.STUDENT,
              username,
              email: row.email ? row.email.toLowerCase() : null,
              firstName,
              lastName,
              birthDate,
              fiscalCode,
              passwordHash,
              status: 'INVITED',
              mustChangePassword: true,
            },
          });

          const profile = await this.prisma.studentProfile.create({
            data: {
              userId: studentUser.id,
            },
          });

          await this.prisma.enrollment.create({
            data: {
              classId: cls.id,
              studentProfileId: profile.id,
              status: 'ACTIVE',
            },
          });

          createdUsers.push({
            id: studentUser.id,
            role: Role.STUDENT,
            firstName,
            lastName,
            username,
            email: studentUser.email,
            temporaryPassword: tempPassword,
            class: className,
          });
        } else if (type === 'TEACHERS') {
          if (!row.email) {
            executionErrors.push({ rowNumber, error: 'Email mancante per docente' });
            continue;
          }

          const teacherUser = await this.prisma.user.create({
            data: {
              schoolId,
              role: Role.TEACHER,
              username,
              email: row.email.toLowerCase(),
              firstName,
              lastName,
              passwordHash,
              status: 'INVITED',
              mustChangePassword: true,
            },
          });

          await this.prisma.teacherProfile.create({
            data: {
              userId: teacherUser.id,
            },
          });

          createdUsers.push({
            id: teacherUser.id,
            role: Role.TEACHER,
            firstName,
            lastName,
            username,
            email: teacherUser.email,
            temporaryPassword: tempPassword,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Errore elaborazione riga';
        executionErrors.push({ rowNumber, error: message });
      }
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId: actorUserId || null,
        actorRole: 'SCHOOL_ADMIN',
        action: 'CSV_IMPORT_EXECUTED',
        entityType: 'ImportJob',
        after: {
          type,
          processed: rows.length,
          created: createdUsers.length,
          errorsCount: executionErrors.length,
        },
      },
    });

    return {
      processed: rows.length,
      createdUsers,
      createdClasses: Array.from(createdClassesSet),
      errors: executionErrors,
    };
  }
}
