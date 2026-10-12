import { Module } from '@nestjs/common';
import { TeachingAssignmentsService } from './teaching-assignments.service';
import { TeachingAssignmentsController } from './teaching-assignments.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TeachingAssignmentsController],
  providers: [TeachingAssignmentsService],
  exports: [TeachingAssignmentsService],
})
export class TeachingAssignmentsModule {}
