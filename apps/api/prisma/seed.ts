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
