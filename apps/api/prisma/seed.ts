import { PrismaClient, Role, UserStatus, SchoolStatus, EnrollmentStatus, NoteVisibility, NoteStatus, MeetingMode } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main() {
  console.log('🌱 Inizio seeding database per Registro Elettronico...');

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

  // 3. School Admin
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

  // 7. Docenti (8 docenti)
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

  // 8. Studenti (20 per classe)
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

  console.log('✅ Seeding completato con successo!');
}

main()
  .catch((e) => {
    console.error('❌ Errore durante il seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
