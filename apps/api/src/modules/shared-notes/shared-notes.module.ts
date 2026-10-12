import { Module } from '@nestjs/common';
import { SharedNotesController } from './shared-notes.controller';
import { SharedNotesService } from './shared-notes.service';

@Module({
  controllers: [SharedNotesController],
  providers: [SharedNotesService],
  exports: [SharedNotesService],
})
export class SharedNotesModule {}
