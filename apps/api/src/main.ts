import { execSync } from 'child_process';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaService } from './prisma/prisma.service';
import { runAutoSeed } from './prisma/seed.runner';

async function bootstrap(): Promise<void> {
  // Sincronizzazione automatica schema Prisma su cloud senza shell interattiva (es. Render Free)
  if (process.env.DATABASE_URL) {
    try {
      console.log('🔄 Sincronizzazione automatica schema database (prisma db push)...');
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log('✅ Schema database sincronizzato con successo.');
    } catch (err) {
      console.warn('⚠️ Nota sincronizzazione schema database:', err);
    }
  }

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Seeding automatico al primo avvio se il database non contiene ancora utenti
  try {
    const prisma = app.get(PrismaService);
    const userCount = await prisma.user.count().catch(() => 0);
    if (userCount === 0) {
      console.log('🌱 Database vuoto rilevato! Avvio popolazione automatica 8 profili demo...');
      await runAutoSeed(prisma);
      console.log('✅ Seeding automatico completato con successo!');
    } else {
      console.log(`ℹ️ Database operativo con ${userCount} utenti registrati.`);
    }
  } catch (err) {
    console.warn('⚠️ Nota verifica seeding automatico:', err);
  }

  // Use pino logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  // CORS configuration
  const webUrl = process.env.WEB_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [webUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-school-id'],
  });

  // Global routing prefix
  app.setGlobalPrefix('api/v1');

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Global filters and pipes
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI 3.1 Documentation via @nestjs/swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Registro Elettronico API')
    .setDescription('REST API per la gestione scolastica e la condivisione di appunti')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Inserisci il token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health', 'Stato e probe del sistema')
    .addTag('Auth', 'Autenticazione e gestione sessioni')
    .addTag('Schools', 'Gestione istituti scolastici')
    .addTag('Users', 'Gestione anagrafiche e profili utente')
    .addTag('Register', 'Registro di classe, voti e presenze')
    .addTag('Notes', 'Appunti condivisi tra studenti e docenti')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Registro Elettronico - API Documentation',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Application listening on port ${port} with prefix /api/v1`);
  logger.log(`📚 Swagger documentation available at http://localhost:${port}/docs`);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
