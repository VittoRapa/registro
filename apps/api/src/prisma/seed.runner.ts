import {
  PrismaClient,
  Role,
  UserStatus,
  SchoolStatus,
  EnrollmentStatus,
  NoteVisibility,
  NoteStatus,
  MeetingMode,
  AttendanceStatus,
  GradeType,
  GradeScaleType,
  LessonType,
} from '@prisma/client';
import * as argon2 from 'argon2';

async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Funzione di seeding automatico che popola il database con tutti i dati demo e gli 8 profili
 */
export async function runAutoSeed(prisma: PrismaClient): Promise<void> {
  console.log('🌱 Inizio seeding automatico database per Registro Elettronico...');

  const defaultPasswordHash = await hashPassword('Password123!#');
  const superAdminPasswordHash = await hashPassword('SuperAdmin2026!#');

  // 1. Super Admin
  let superAdmin = await prisma.user.findFirst({
    where: { username: 'superadmin', role: Role.SUPER_ADMIN },
  });
  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        username: 'superadmin',
        email: 'superadmin@registro.it',
        firstName: 'Super',
        lastName: 'Administrator',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: superAdminPasswordHash,
        mustChangePassword: false,
      },
    });
  }
  console.log(`✓ SuperAdmin pronto: ${superAdmin.username}`);

  // 2. Scuola (Tenant)
  const school = await prisma.school.upsert({
    where: { slug: 'liceo-da-vinci' },
    update: {},
    create: {
      name: 'Liceo Scientifico Leonardo da Vinci',
      code: 'RMIS00100X',
      slug: 'liceo-da-vinci',
      status: SchoolStatus.ACTIVE,
      settings: {
        gradingSystem: 'DECIMALS',
        minGrade: 1,
        maxGrade: 10,
        passingGrade: 6,
      },
    },
  });
  console.log(`✓ Scuola creata: ${school.name} (${school.id})`);

  // 3. School Admin (Preside)
  const schoolAdmin = await prisma.user.upsert({
    where: {
      schoolId_username: {
        schoolId: school.id,
        username: 'admin.davinci',
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      username: 'admin.davinci',
      email: 'preside@liceodavinci.edu.it',
      firstName: 'Marco',
      lastName: 'Rossi',
      role: Role.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
  });
  console.log(`✓ SchoolAdmin creato: ${schoolAdmin.username}`);

  // 4. Anno Scolastico & Quadrimestri
  const academicYear = await prisma.academicYear.upsert({
    where: {
      schoolId_name: {
        schoolId: school.id,
        name: '2025/2026',
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      name: '2025/2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      isCurrent: true,
      terms: {
        create: [
          {
            name: '1° Quadrimestre',
            startDate: new Date('2025-09-01'),
            endDate: new Date('2026-01-31'),
            order: 1,
          },
          {
            name: '2° Quadrimestre',
            startDate: new Date('2026-02-01'),
            endDate: new Date('2026-06-30'),
            order: 2,
          },
        ],
      },
    },
  });
  console.log(`✓ Anno accademico creato: ${academicYear.name}`);

  // 5. Materie
  const subjectsData = [
    { name: 'Matematica', shortName: 'MAT', color: '#3B82F6' },
    { name: 'Italiano', shortName: 'ITA', color: '#10B981' },
    { name: 'Fisica', shortName: 'FIS', color: '#8B5CF6' },
    { name: 'Storia e Filosofia', shortName: 'STO-FIL', color: '#F59E0B' },
    { name: 'Lingua Inglese', shortName: 'ING', color: '#EC4899' },
  ];

  const subjects = [];
  for (const s of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: {
        schoolId_name: {
          schoolId: school.id,
          name: s.name,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        name: s.name,
        shortName: s.shortName,
        color: s.color,
      },
    });
    subjects.push(subject);
  }
  console.log(`✓ Materie create: ${subjects.length}`);

  // 6. Classi
  const classesData = [
    { name: '1A', grade: 1, section: 'A' },
    { name: '2A', grade: 2, section: 'A' },
    { name: '3A', grade: 3, section: 'A' },
  ];

  const classes = [];
  for (const c of classesData) {
    const cls = await prisma.class.upsert({
      where: {
        schoolId_academicYearId_name: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          name: c.name,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: c.name,
        grade: c.grade,
        section: c.section,
      },
    });
    classes.push(cls);
  }
  console.log(`✓ Classi create: ${classes.length}`);

  // 7. Docenti
  const teachersData = [
    { firstName: 'Mario', lastName: 'Bianchi', subjectIdx: 0 },
    { firstName: 'Lucia', lastName: 'Verdi', subjectIdx: 1 },
    { firstName: 'Giuseppe', lastName: 'Ferrari', subjectIdx: 2 },
    { firstName: 'Anna', lastName: 'Esposito', subjectIdx: 3 },
    { firstName: 'Roberto', lastName: 'Romano', subjectIdx: 4 },
  ];

  for (let i = 0; i < teachersData.length; i++) {
    const t = teachersData[i];
    if (!t) continue;
    const username = `docente.${t.lastName.toLowerCase()}${i}`;
    const email = `${username}@liceodavinci.edu.it`;
    const employeeCode = `DOC-${1000 + i}`;

    let teacherUser = await prisma.user.findFirst({
      where: { schoolId: school.id, username },
      include: { teacherProfile: true },
    });

    if (!teacherUser) {
      teacherUser = await prisma.user.create({
        data: {
          schoolId: school.id,
          username,
          email,
          firstName: t.firstName,
          lastName: t.lastName,
          role: Role.TEACHER,
          status: UserStatus.ACTIVE,
          passwordHash: defaultPasswordHash,
          mustChangePassword: false,
          teacherProfile: {
            create: {
              employeeCode,
            },
          },
        },
        include: { teacherProfile: true },
      });
    }

    const assignedSubject = subjects[t.subjectIdx] || subjects[0];
    const assignedClass = classes[i % classes.length] || classes[0];

    if (teacherUser.teacherProfile && assignedClass && assignedSubject) {
      const existingAssignment = await prisma.teachingAssignment.findFirst({
        where: {
          academicYearId: academicYear.id,
          teacherProfileId: teacherUser.teacherProfile.id,
          classId: assignedClass.id,
          subjectId: assignedSubject.id,
        },
      });

      if (!existingAssignment) {
        await prisma.teachingAssignment.create({
          data: {
            academicYearId: academicYear.id,
            teacherProfileId: teacherUser.teacherProfile.id,
            classId: assignedClass.id,
            subjectId: assignedSubject.id,
          },
        });
      }
    }
  }
  console.log(`✓ Docenti e cattedre creati: ${teachersData.length}`);

  // 8. Studenti
  let studentCount = 0;
  for (let cIdx = 0; cIdx < classes.length; cIdx++) {
    const currentClass = classes[cIdx];
    if (!currentClass) continue;

    for (let sIdx = 1; sIdx <= 15; sIdx++) {
      studentCount++;
      const matricola = `2025${studentCount.toString().padStart(4, '0')}`;
      const username = `studente.${matricola}`;
      const email = `${username}@liceodavinci.edu.it`;

      const existingStudent = await prisma.user.findFirst({
        where: { schoolId: school.id, username },
      });

      if (!existingStudent) {
        await prisma.user.create({
          data: {
            schoolId: school.id,
            username,
            email,
            firstName: `Studente${studentCount}`,
            lastName: `Cognome${cIdx + 1}`,
            role: Role.STUDENT,
            status: UserStatus.ACTIVE,
            passwordHash: defaultPasswordHash,
            mustChangePassword: false,
            studentProfile: {
              create: {
                matricola,
                enrollments: {
                  create: {
                    classId: currentClass.id,
                    status: EnrollmentStatus.ACTIVE,
                  },
                },
              },
            },
          },
        });
      }
    }
  }
  console.log(`✓ Studenti creati e iscritti alle classi: ${studentCount}`);

  // 9. Genitore collegato a studente 20250001
  const firstStudent = await prisma.studentProfile.findFirst({
    where: { matricola: '20250001' },
    include: { user: true },
  });

  if (firstStudent) {
    let parentUser = await prisma.user.findFirst({
      where: { schoolId: school.id, username: 'genitore.rossi' },
    });

    if (!parentUser) {
      parentUser = await prisma.user.create({
        data: {
          schoolId: school.id,
          username: 'genitore.rossi',
          email: 'genitore.rossi@famiglia.it',
          firstName: 'Giuseppe',
          lastName: 'Rossi',
          role: Role.PARENT,
          status: UserStatus.ACTIVE,
          passwordHash: defaultPasswordHash,
          mustChangePassword: false,
        },
      });
    }

    await prisma.parentLink.upsert({
      where: {
        parentUserId_studentProfileId: {
          parentUserId: parentUser.id,
          studentProfileId: firstStudent.id,
        },
      },
      update: {},
      create: {
        parentUserId: parentUser.id,
        studentProfileId: firstStudent.id,
      },
    });
    console.log(`✓ Genitore collegato a studente 20250001: ${parentUser.username}`);
  }

  // 9b. Secondo Genitore e Secondo Studente
  const secondStudent = await prisma.studentProfile.findFirst({
    where: { matricola: '20250002' },
    include: { user: true },
  });

  if (secondStudent) {
    let parentBianchi = await prisma.user.findFirst({
      where: { schoolId: school.id, username: 'genitore.bianchi' },
    });

    if (!parentBianchi) {
      parentBianchi = await prisma.user.create({
        data: {
          schoolId: school.id,
          username: 'genitore.bianchi',
          email: 'genitore.bianchi@famiglia.it',
          firstName: 'Carla',
          lastName: 'Bianchi',
          role: Role.PARENT,
          status: UserStatus.ACTIVE,
          passwordHash: defaultPasswordHash,
          mustChangePassword: false,
        },
      });
    }

    await prisma.parentLink.upsert({
      where: {
        parentUserId_studentProfileId: {
          parentUserId: parentBianchi.id,
          studentProfileId: secondStudent.id,
        },
      },
      update: {},
      create: {
        parentUserId: parentBianchi.id,
        studentProfileId: secondStudent.id,
      },
    });
    console.log(`✓ Secondo Genitore collegato a studente 20250002: ${parentBianchi.username}`);
  }

  // 9c. Vicepreside
  const vicePreside = await prisma.user.upsert({
    where: {
      schoolId_username: {
        schoolId: school.id,
        username: 'vicepreside.davinci',
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      username: 'vicepreside.davinci',
      email: 'vicepreside@liceodavinci.edu.it',
      firstName: 'Laura',
      lastName: 'Mancini',
      role: Role.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
  });
  console.log(`✓ Vicepreside creato: ${vicePreside.username}`);

  // 9d. Popolamento Voti di Esempio
  const terms = await prisma.term.findMany({
    where: { academicYearId: academicYear.id },
    orderBy: { order: 'asc' },
  });
  const currentTerm = terms[0] || null;

  const class1AAssignments = await prisma.teachingAssignment.findMany({
    where: {
      classId: classes[0]?.id,
      academicYearId: academicYear.id,
    },
    include: { subject: true, teacherProfile: { include: { user: true } } },
  });

  if (firstStudent && currentTerm && class1AAssignments.length > 0) {
    const existingGradesCount = await prisma.grade.count({
      where: { studentProfileId: firstStudent.id },
    });

    if (existingGradesCount === 0) {
      for (const assignment of class1AAssignments) {
        const teacherUserId = assignment.teacherProfile.userId;
        const subjName = assignment.subject.name;

        const gradesConfig = [
          { value: 8.5, display: '8½', type: GradeType.SCRITTO, desc: `Verifica scritta ${subjName}` },
          { value: 9.0, display: '9', type: GradeType.ORALE, desc: `Interrogazione orale ${subjName}` },
          { value: 8.0, display: '8', type: GradeType.PRATICO, desc: `Laboratorio ${subjName}` },
        ];

        for (let gIdx = 0; gIdx < gradesConfig.length; gIdx++) {
          const gc = gradesConfig[gIdx];
          if (!gc) continue;
          const gradeDate = new Date();
          gradeDate.setDate(gradeDate.getDate() - (gIdx * 10 + 2));

          await prisma.grade.create({
            data: {
              teachingAssignmentId: assignment.id,
              studentProfileId: firstStudent.id,
              termId: currentTerm.id,
              value: gc.value,
              scaleType: GradeScaleType.NUMERIC_10,
              displayValue: gc.display,
              weight: 1.0,
              type: gc.type,
              date: gradeDate,
              description: gc.desc,
              visibleToStudent: true,
              createdByTeacherId: teacherUserId,
            },
          });
        }

        if (secondStudent) {
          const isMath = subjName.toLowerCase().includes('matematica');
          const secondVal = isMath ? 4.5 : 6.5;
          const secondDisp = isMath ? '4½' : '6½';

          await prisma.grade.create({
            data: {
              teachingAssignmentId: assignment.id,
              studentProfileId: secondStudent.id,
              termId: currentTerm.id,
              value: secondVal,
              scaleType: GradeScaleType.NUMERIC_10,
              displayValue: secondDisp,
              weight: 1.0,
              type: GradeType.SCRITTO,
              date: new Date(),
              description: `Verifica scritta ${subjName}`,
              visibleToStudent: true,
              createdByTeacherId: teacherUserId,
            },
          });
        }
      }
      console.log('✓ Voti realistici popolati per studenti 20250001 e 20250002');
    }
  }

  // 9e. Lezione firmata con Registro Presenze/Assenze di oggi
  const mathAssignment = class1AAssignments.find((a) => a.subject.name === 'Matematica') || class1AAssignments[0];
  if (mathAssignment && classes[0]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lesson = await prisma.lessonRecord.findFirst({
      where: {
        classId: classes[0].id,
        date: today,
        periodNumber: 1,
      },
    });

    if (!lesson) {
      lesson = await prisma.lessonRecord.create({
        data: {
          teachingAssignmentId: mathAssignment.id,
          classId: classes[0].id,
          date: today,
          periodNumber: 1,
          topic: 'Introduzione ai limiti notevoli e disequazioni razionali fratte',
          notes: 'Classe attenta e partecipativa. Esercizi svolti alla lavagna.',
          type: LessonType.LESSON,
          signedByTeacherId: mathAssignment.teacherProfile.userId,
          signedAt: new Date(),
        },
      });

      if (firstStudent) {
        await prisma.attendanceRecord.create({
          data: {
            lessonRecordId: lesson.id,
            studentProfileId: firstStudent.id,
            status: AttendanceStatus.PRESENT,
            recordedByTeacherId: mathAssignment.teacherProfile.userId,
          },
        });
      }

      if (secondStudent) {
        await prisma.attendanceRecord.create({
          data: {
            lessonRecordId: lesson.id,
            studentProfileId: secondStudent.id,
            status: AttendanceStatus.LATE,
            minutesLate: 10,
            recordedByTeacherId: mathAssignment.teacherProfile.userId,
          },
        });
      }
      console.log('✓ Lezione e registro presenze di oggi firmati');
    }

    // 9f. Compito per casa in Agenda
    const existingHomework = await prisma.homework.findFirst({
      where: { classId: classes[0].id, teachingAssignmentId: mathAssignment.id },
    });

    if (!existingHomework) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);

      await prisma.homework.create({
        data: {
          teachingAssignmentId: mathAssignment.id,
          classId: classes[0].id,
          createdByUserId: mathAssignment.teacherProfile.userId,
          assignedDate: today,
          dueDate,
          title: 'Esercizi di consolidamento sui Limiti Notevoli',
          description: 'Svolgere esercizi da pag. 142 numeri 15, 18, 22 e 25 del libro di testo.',
          estimatedMinutes: 45,
        },
      });
      console.log('✓ Compiti per casa aggiunti in agenda');
    }
  }

  // 9g. Circolare / Comunicazione d'Istituto
  const existingAnnouncement = await prisma.announcement.findFirst({
    where: { authorId: schoolAdmin.id },
  });

  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        authorId: schoolAdmin.id,
        title: 'Circolare n. 42: Calendario Ricevimento Docenti e Colloqui Scuola-Famiglia',
        body: `Gentili famiglie e docenti,\n\nSi comunica che da lunedì prossimo sono aperte le prenotazioni per i colloqui individuali del primo quadrimestre tramite la piattaforma del Registro Elettronico.\n\nCordiali saluti,\nLa Dirigenza Scolastica.`,
        audience: { roles: ['TEACHER', 'PARENT', 'STUDENT'] },
        publishAt: new Date(),
      },
    });
    console.log('✓ Circolare d\'Istituto pubblicata');
  }

  // 10. Docente slot disponibilità colloqui
  const teacherBianchi = await prisma.user.findFirst({
    where: { username: 'docente.bianchi0' },
  });

  if (teacherBianchi) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(16, 0, 0, 0);

    await prisma.teacherAvailabilitySlot.create({
      data: {
        teacherId: teacherBianchi.id,
        startAt: tomorrow,
        endAt: tomorrowEnd,
        capacity: 3,
        mode: MeetingMode.PRESENZA,
      },
    });
    console.log('✓ Slot colloqui docente creato');
  }

  // 11. Appunto condiviso demo
  const authorStudent = await prisma.user.findFirst({
    where: { username: 'studente.20250001' },
  });
  const mathSubject = subjects[0];
  const class1A = classes[0];

  if (authorStudent && mathSubject && class1A) {
    await prisma.sharedNote.create({
      data: {
        schoolId: school.id,
        authorId: authorStudent.id,
        subjectId: mathSubject.id,
        classId: class1A.id,
        grade: 1,
        title: 'Studio dei Limiti Notevoli e Derivate',
        description: 'Dispensa riassuntiva completa con formule dimostrate in KaTeX e grafici',
        contentType: 'MARKDOWN',
        visibility: NoteVisibility.SCHOOL,
        status: NoteStatus.PUBLISHED,
        markdownBody: `# Studio dei Limiti Notevoli e Derivate

Ecco il riassunto completo delle formule fondamentali per la verifica:

## 1. Limite notevole fondamentale
$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$$

E la sua conseguenza per il coseno:
$$\\lim_{x \\to 0} \\frac{1 - \\cos(x)}{x^2} = \\frac{1}{2}$$

## 2. Definizione formale di Derivata
Data una funzione $f(x)$ definita in un intervallo $(a, b)$, la derivata prima in un punto $x_0$ è data dal limite del rapporto incrementale:
$$f'(x_0) = \\lim_{h \\to 0} \\frac{f(x_0 + h) - f(x_0)}{h}$$

Buono studio a tutta la classe!
`,
      },
    });
    console.log('✓ Appunto condiviso demo creato');
  }

  console.log('✅ Seeding completato con successo! Tutti i dati demo sono pronti.');
}
