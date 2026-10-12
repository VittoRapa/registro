import { Module } from '@nestjs/common';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
