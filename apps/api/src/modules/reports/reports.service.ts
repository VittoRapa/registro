import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Import pdfmake v0.3 printer and URLResolver
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake/js/printer').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const URLResolver = require('pdfmake/js/URLResolver').default;

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

@Injectable()
export class ReportsService {
  private printer: unknown;

  constructor(private readonly prisma: PrismaService) {
    this.printer = new PdfPrinter(FONTS, null, new URLResolver());
  }

  /**
   * Genera la Pagella Scolastica Ufficiale in formato PDF
   */
  async generateReportCardPdf(studentProfileId: string, schoolId: string): Promise<{ buffer: Buffer; filename: string }> {
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        id: studentProfileId,
        user: { schoolId },
      },
      include: {
        user: { include: { school: true } },
        enrollments: {
          include: {
            class: {
              include: { academicYear: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Profilo studente non trovato');
    }

    const currentEnrollment = student.enrollments[0];
    const currentClass = currentEnrollment?.class;
    const academicYear = currentClass?.academicYear || await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });

    // Recupera tutti i voti dello studente
    const grades = await this.prisma.grade.findMany({
      where: {
        studentProfileId,
        deletedAt: null,
      },
      include: {
        teachingAssignment: {
          include: {
            subject: true,
            teacherProfile: { include: { user: true } },
          },
        },
      },
    });

    // Raggruppa i voti per materia
    const subjectMap = new Map<string, { name: string; grades: number[]; weights: number[] }>();
    for (const g of grades) {
      const subName = g.teachingAssignment?.subject?.name || 'Materia';
      if (!subjectMap.has(subName)) {
        subjectMap.set(subName, { name: subName, grades: [], weights: [] });
      }
      const entry = subjectMap.get(subName)!;
      if (g.value !== null) {
        entry.grades.push(Number(g.value));
        entry.weights.push(Number(g.weight));
      }
    }

    // Calcola presenze e assenze
    const attendances = await this.prisma.attendanceRecord.findMany({
      where: { studentProfileId },
    });
    const totalAbsences = attendances.filter(a => a.status === 'ABSENT').length;
    const justifiedAbsences = attendances.filter(a => a.status === 'ABSENT' && a.justificationId !== null).length;

    // Prepara righe tabella materie
    const tableBody: Array<Array<{ text: string; bold?: boolean; alignment?: string; fillColor?: string }>> = [
      [
        { text: 'Materia Didattica', bold: true, fillColor: '#f1f5f9' },
        { text: 'Prove Sostenute', bold: true, alignment: 'center', fillColor: '#f1f5f9' },
        { text: 'Media Ponderata', bold: true, alignment: 'center', fillColor: '#f1f5f9' },
        { text: 'Valutazione / Esito', bold: true, alignment: 'center', fillColor: '#f1f5f9' },
      ],
    ];

    let overallSum = 0;
    let overallWeight = 0;

    for (const [subName, data] of subjectMap.entries()) {
      let weightedSum = 0;
      let totalW = 0;
      for (let i = 0; i < data.grades.length; i++) {
        const val = data.grades[i] ?? 0;
        const w = data.weights[i] ?? 1;
        weightedSum += val * w;
        totalW += w;
      }
      const avg = totalW > 0 ? (weightedSum / totalW) : 0;
      if (totalW > 0) {
        overallSum += weightedSum;
        overallWeight += totalW;
      }

      const avgText = avg > 0 ? avg.toFixed(2) : '-';
      const statusText = avg >= 6 ? 'SUFFICIENTE' : avg > 0 ? 'INSUFFICIENTE' : 'N.V.';

      tableBody.push([
        { text: subName },
        { text: data.grades.length.toString(), alignment: 'center' },
        { text: avgText, alignment: 'center', bold: true },
        { text: statusText, alignment: 'center', bold: true, fillColor: avg < 6 && avg > 0 ? '#fee2e2' : undefined },
      ]);
    }

    if (tableBody.length === 1) {
      tableBody.push([
        { text: 'Nessuna valutazione registrata nel periodo' },
        { text: '0', alignment: 'center' },
        { text: '-', alignment: 'center' },
        { text: 'In Corso', alignment: 'center' },
      ]);
    }

    const overallAvg = overallWeight > 0 ? (overallSum / overallWeight).toFixed(2) : '-';
    const issueDate = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    const schoolName = student.user.school?.name || 'Istituto Scolastico';

    // Definizione documento PDF (pdfmake)
    const docDefinition = {
      defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#1e293b' },
      pageMargins: [40, 40, 40, 40],
      content: [
        // Intestazione Istituzionale
        { text: 'REPUBBLICA ITALIANA', fontSize: 12, bold: true, alignment: 'center', color: '#475569' },
        { text: 'MINISTERO DELL\'ISTRUZIONE E DEL MERITO', fontSize: 10, alignment: 'center', color: '#64748b', margin: [0, 2, 0, 10] },
        { text: schoolName.toUpperCase(), fontSize: 14, bold: true, alignment: 'center', color: '#0f172a' },
        { text: `Anno Scolastico: ${academicYear?.name || '2025/2026'}`, fontSize: 9, alignment: 'center', color: '#64748b', margin: [0, 2, 0, 15] },
        
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#2563eb' }],
          margin: [0, 0, 0, 15],
        },

        // Titolo Documento
        { text: 'SCHEDA DI VALUTAZIONE PERIODICA INDIVIDUALE', fontSize: 13, bold: true, alignment: 'center', margin: [0, 0, 0, 15] },

        // Dati Identificativi Studente
        {
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              [
                { text: 'Cognome e Nome:', bold: true },
                { text: `${student.user.lastName} ${student.user.firstName}` },
                { text: 'Codice Fiscale:', bold: true },
                { text: student.user.fiscalCode ? `${student.user.fiscalCode.slice(0, 3)}****${student.user.fiscalCode.slice(-3)}` : 'Non specificato' },
              ],
              [
                { text: 'Classe / Sezione:', bold: true },
                { text: currentClass?.name || '-' },
                { text: 'Data Nascita:', bold: true },
                { text: student.user.birthDate ? new Date(student.user.birthDate).toLocaleDateString('it-IT') : '-' },
              ],
            ],
          },
          margin: [0, 0, 0, 15],
        },

        // Tabella Valutazioni
        { text: 'PROFITTO E VALUTAZIONE DISCIPLINARE', fontSize: 11, bold: true, margin: [0, 10, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: ['40%', '20%', '20%', '20%'],
            body: tableBody,
          },
          margin: [0, 0, 0, 15],
        },

        // Sintesi e Presenze
        {
          columns: [
            {
              width: '50%',
              table: {
                widths: ['60%', '40%'],
                body: [
                  [{ text: 'Media Generale Ponderata:', bold: true }, { text: overallAvg, bold: true, alignment: 'center' }],
                  [{ text: 'Esito Globale:', bold: true }, { text: Number(overallAvg) >= 6 ? 'Positivo' : 'Da Consolidare', alignment: 'center' }],
                ],
              },
            },
            {
              width: '50%',
              table: {
                widths: ['60%', '40%'],
                body: [
                  [{ text: 'Giorni di Assenza:', bold: true }, { text: totalAbsences.toString(), alignment: 'center' }],
                  [{ text: 'Assenze Giustificate:', bold: true }, { text: justifiedAbsences.toString(), alignment: 'center' }],
                ],
              },
            },
          ],
          columnGap: 10,
          margin: [0, 0, 0, 30],
        },

        // Sezione Firme e Timbro Istituzionale
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: `Data di Rilascio: ${issueDate}`, fontSize: 9, color: '#64748b' },
                { text: 'Documento generato dal Registro Elettronico', fontSize: 8, color: '#94a3b8', margin: [0, 4, 0, 0] },
                { text: 'Firma digitale ai sensi dell\'art. 21 CAD', fontSize: 8, color: '#94a3b8' },
              ],
            },
            {
              width: '50%',
              alignment: 'right',
              stack: [
                { text: 'Il Dirigente Scolastico', bold: true, fontSize: 10 },
                { text: '(Firma autografa sostituita a mezzo stampa)', fontSize: 8, italics: true, color: '#64748b', margin: [0, 35, 0, 0] },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await this.renderPdf(docDefinition);
    const sanitizedName = `${student.user.lastName}_${student.user.firstName}`.replace(/[^a-zA-Z0-9]/g, '_');
    return { buffer, filename: `pagella_${sanitizedName}.pdf` };
  }

  /**
   * Genera il Tabellone di Classe in formato PDF
   */
  async generateClassBoardPdf(classId: string, schoolId: string): Promise<{ buffer: Buffer; filename: string }> {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: {
        school: true,
        academicYear: true,
        enrollments: {
          include: {
            studentProfile: {
              include: { user: true },
            },
          },
          orderBy: {
            studentProfile: {
              user: { lastName: 'asc' },
            },
          },
        },
      },
    });

    if (!classEntity) {
      throw new NotFoundException('Classe non trovata');
    }

    const students = classEntity.enrollments.map(e => e.studentProfile);

    const subjects = await this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    const grades = await this.prisma.grade.findMany({
      where: {
        teachingAssignment: { classId },
        deletedAt: null,
      },
      include: {
        teachingAssignment: true,
      },
    });

    // Mappa studentProfileId -> subjectId -> voti
    const studentGradesMap = new Map<string, Map<string, number[]>>();
    for (const g of grades) {
      if (!studentGradesMap.has(g.studentProfileId)) {
        studentGradesMap.set(g.studentProfileId, new Map());
      }
      const subMap = studentGradesMap.get(g.studentProfileId)!;
      const subId = g.teachingAssignment.subjectId;
      if (!subMap.has(subId)) {
        subMap.set(subId, []);
      }
      if (g.value !== null) {
        subMap.get(subId)!.push(Number(g.value));
      }
    }

    // Costruzione tabella
    const headerRow: Array<{ text: string; bold?: boolean; alignment?: string; fillColor?: string }> = [
      { text: 'Studente', bold: true, fillColor: '#f1f5f9' },
    ];
    for (const s of subjects) {
      headerRow.push({ text: s.shortName || s.name.slice(0, 4), bold: true, alignment: 'center', fillColor: '#f1f5f9' });
    }
    headerRow.push({ text: 'Media', bold: true, alignment: 'center', fillColor: '#f1f5f9' });

    const tableRows = [headerRow];

    for (const st of students) {
      const row: Array<{ text: string; bold?: boolean; alignment?: string; fillColor?: string }> = [
        { text: `${st.user.lastName} ${st.user.firstName.slice(0, 1)}.` },
      ];
      let sumAll = 0;
      let countAll = 0;

      const subMap = studentGradesMap.get(st.id);
      for (const s of subjects) {
        const studentSubGrades = subMap?.get(s.id);
        if (studentSubGrades && studentSubGrades.length > 0) {
          const avg = studentSubGrades.reduce((a, b) => a + b, 0) / studentSubGrades.length;
          sumAll += avg;
          countAll++;
          row.push({
            text: avg.toFixed(1),
            alignment: 'center',
            fillColor: avg < 6 ? '#fee2e2' : undefined,
          });
        } else {
          row.push({ text: '-', alignment: 'center' });
        }
      }

      const totalAvg = countAll > 0 ? (sumAll / countAll).toFixed(1) : '-';
      row.push({ text: totalAvg, alignment: 'center', bold: true });
      tableRows.push(row);
    }

    const docDefinition = {
      pageOrientation: 'landscape',
      pageMargins: [30, 30, 30, 30],
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
      content: [
        { text: `${classEntity.school.name} - TABELLONE DI CLASSE ${classEntity.name}`, fontSize: 14, bold: true, alignment: 'center' },
        { text: `Anno Scolastico: ${classEntity.academicYear?.name || 'Corrente'} | Data Stampa: ${new Date().toLocaleDateString('it-IT')}`, fontSize: 9, alignment: 'center', color: '#64748b', margin: [0, 2, 0, 15] },
        {
          table: {
            headerRows: 1,
            body: tableRows,
          },
        },
      ],
    };

    const buffer = await this.renderPdf(docDefinition);
    return { buffer, filename: `tabellone_${classEntity.name}.pdf` };
  }

  private async renderPdf(docDefinition: Record<string, unknown>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.printer as any).createPdfKitDocument(docDefinition).then((doc: any) => {
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));
        doc.end();
      }).catch(reject);
    });
  }
}
