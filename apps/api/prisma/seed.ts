import { PrismaClient, Role, UserStatus, SchoolStatus, EnrollmentStatus } from '@prisma/client';
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
  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
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
  console.log(`✓ SuperAdmin creato: ${superAdmin.username}`);

  // 2. Scuola (Tenant)
  const school = await prisma.school.upsert({
    where: { code: 'RMIS00100X' },
    update: {},
    create: {
      name: 'Liceo Scientifico Leonardo da Vinci',
      code: 'RMIS00100X',
      status: SchoolStatus.ACTIVE,
      plan: 'ENTERPRISE',
      academicCycle: 'SUPERIORE',
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
    where: { username: 'admin.davinci' },
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
      isActive: true,
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
    { name: 'Matematica', code: 'MAT', color: '#3B82F6' },
    { name: 'Italiano', code: 'ITA', color: '#10B981' },
    { name: 'Fisica', code: 'FIS', color: '#8B5CF6' },
    { name: 'Storia e Filosofia', code: 'STO-FIL', color: '#F59E0B' },
    { name: 'Lingua Inglese', code: 'ING', color: '#EC4899' },
  ];

  const subjects = [];
  for (const s of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: s.code,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        name: s.name,
        code: s.code,
        color: s.color,
      },
    });
    subjects.push(subject);
  }
  console.log(`✓ Materie create: ${subjects.length}`);

  // 6. Classi
  const classesData = [
    { year: 1, section: 'A' },
    { year: 2, section: 'A' },
    { year: 3, section: 'A' },
  ];

  const classes = [];
  for (const c of classesData) {
    const cls = await prisma.class.upsert({
      where: {
        schoolId_year_section_academicYearId: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          year: c.year,
          section: c.section,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: `${c.year}${c.section}`,
        year: c.year,
        section: c.section,
      },
    });
    classes.push(cls);
  }
  console.log(`✓ Classi create: ${classes.length}`);

  // 7. Docenti (8 docenti)
  const teachersData = [
    { firstName: 'Mario', lastName: 'Bianchi', subjectCode: 'MAT' },
    { firstName: 'Lucia', lastName: 'Verdi', subjectCode: 'ITA' },
    { firstName: 'Giuseppe', lastName: 'Ferrari', subjectCode: 'FIS' },
    { firstName: 'Anna', lastName: 'Esposito', subjectCode: 'STO-FIL' },
    { firstName: 'Roberto', lastName: 'Romano', subjectCode: 'ING' },
    { firstName: 'Elena', lastName: 'Colombo', subjectCode: 'MAT' },
    { firstName: 'Antonio', lastName: 'Ricci', subjectCode: 'ITA' },
    { firstName: 'Federica', lastName: 'Marino', subjectCode: 'FIS' },
  ];

  for (let i = 0; i < teachersData.length; i++) {
    const t = teachersData[i];
    const username = `docente.${t.lastName.toLowerCase()}${i}`;
    const email = `${username}@liceodavinci.edu.it`;
    const employeeCode = `DOC-${1000 + i}`;

    const teacherUser = await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
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

    // Assign to a class and subject
    const subject = subjects.find((s) => s.code === t.subjectCode) || subjects[0];
    const assignedClass = classes[i % classes.length];

    if (teacherUser.teacherProfile) {
      await prisma.teachingAssignment.upsert({
        where: {
          teacherProfileId_classId_subjectId: {
            teacherProfileId: teacherUser.teacherProfile.id,
            classId: assignedClass.id,
            subjectId: subject.id,
          },
        },
        update: {},
        create: {
          teacherProfileId: teacherUser.teacherProfile.id,
          classId: assignedClass.id,
          subjectId: subject.id,
        },
      });
    }
  }
  console.log(`✓ Docenti e cattedre creati: ${teachersData.length}`);

  // 8. Studenti (60 studenti - 20 per classe)
  let studentCount = 0;
  for (let cIdx = 0; cIdx < classes.length; cIdx++) {
    const currentClass = classes[cIdx];
    for (let sIdx = 1; sIdx <= 20; sIdx++) {
      studentCount++;
      const matricola = `2025${studentCount.toString().padStart(4, '0')}`;
      const username = `studente.${matricola}`;
      const email = `${username}@liceodavinci.edu.it`;

      const studentUser = await prisma.user.upsert({
        where: { username },
        update: {},
        create: {
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
  console.log(`✓ Studenti creati e iscritti alle classi: ${studentCount}`);

  // 9. Genitore associato al primo studente
  const firstStudent = await prisma.studentProfile.findFirst({
    where: { matricola: '20250001' },
    include: { user: true },
  });

  if (firstStudent) {
    const parentUser = await prisma.user.upsert({
      where: { username: 'genitore.rossi' },
      update: {},
      create: {
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

  // 10. Docente demo e slot colloqui
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
        mode: 'PRESENZA',
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
        gradeLevel: 1,
        title: 'Studio dei Limiti Notevoli e Derivate',
        description: 'Dispensa riassuntiva completa con formule dimostrate in KaTeX e grafici',
        type: 'MARKDOWN',
        visibility: 'SCHOOL',
        status: 'PUBLISHED',
        markdownContent: `# Studio dei Limiti Notevoli e Derivate

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
