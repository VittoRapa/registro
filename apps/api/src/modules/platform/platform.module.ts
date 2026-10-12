import { Module } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { AppConfigController } from './app-config.controller';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CryptoModule, AuthModule],
  controllers: [PlatformController, AppConfigController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
