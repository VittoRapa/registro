import { Module } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CryptoModule, AuthModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
