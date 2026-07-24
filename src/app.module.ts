import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseModule } from '@/db/database.module';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { wrapBaResponseMiddleware } from '@/common/middleware/wrap-ba-response';
import { validateEnv } from '@/config/env.validation';
import { auth } from '@/auth';
import { BridgeModule } from '@/bridge/bridge.module';
import { WalletModule } from '@/wallet/wallet.module';
import { TransfersModule } from '@/transfers/transfers.module';
import { PaymentsModule } from '@/payments/payments.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { UserModule } from '@/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule.forRoot({
      auth,
      middleware: wrapBaResponseMiddleware,
      bodyParser: {
        json: { limit: '1mb' },
        urlencoded: { limit: '1mb', extended: true },
      },
    }),
    BridgeModule,
    WalletModule,
    TransfersModule,
    PaymentsModule,
    NotificationsModule,
    UserModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
