import { Module } from '@nestjs/common';
import { DisciplinaryNotesController } from './disciplinary-notes.controller';
import { DisciplinaryNotesService } from './disciplinary-notes.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DisciplinaryNotesController],
  providers: [DisciplinaryNotesService],
  exports: [DisciplinaryNotesService],
})
export class DisciplinaryNotesModule {}
