import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('config')
export class AppConfigController {
  constructor(private config: ConfigService) {}

  @Get('public')
  getPublicConfig() {
    const skipSmsVerify =
      this.config.get('SKIP_SMS_VERIFY') === 'true' ||
      this.config.get('LOCAL_DEV') === 'true';

    return {
      storageMode: this.config.get('STORAGE_MODE', 'oss'),
      paymentMode: this.config.get('PAYMENT_MODE', 'live'),
      isDev: this.config.get('NODE_ENV') !== 'production',
      skipSmsVerify,
    };
  }
}
