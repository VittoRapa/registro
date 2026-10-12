import { Module } from '@nestjs/common';
import { AcademicYearsService } from './academic-years.service';
import { AcademicYearsController } from './academic-years.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AcademicYearsController],
  providers: [AcademicYearsService],
  exports: [AcademicYearsService],
})
export class AcademicYearsModule {}
