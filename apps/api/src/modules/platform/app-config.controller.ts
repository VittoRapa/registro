import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Platform')
@Controller('app-config')
export class AppConfigController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Configurazione client mobile, versioning e kill-switch' })
  getAppConfig(
    @Headers('x-app-version') appVersion?: string,
    @Headers('x-platform') _platform?: string,
  ) {
    const minSupportedVersion = '0.1.0';
    const latestVersion = '0.6.0';
    const maintenanceMode = false;

    const updateRequired = Boolean(appVersion && appVersion < minSupportedVersion);

    return {
      minSupportedVersion,
      latestVersion,
      maintenanceMode,
      updateRequired,
      message: null,
      updateUrl: {
        ios: 'https://apps.apple.com/app/registro-elettronico',
        android: 'https://play.google.com/store/apps/details?id=it.scuola.registro',
      },
      features: {
        pushNotifications: true,
        sharedNotesMarketplace: true,
        spacedRepetitionFlashcards: true,
        gradeSimulator: true,
        totpTwoFactor: true,
      },
    };
  }
}
