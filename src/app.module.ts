import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { AppController } from "@/app.controller";
import { AppService } from "@/app.service";
import { DrizzleModule } from "@/db/drizzle.module";
import { ResponseInterceptor } from "@/common/interceptors/response.interceptor";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { wrapBaResponseMiddleware } from "@/common/middleware/wrap-ba-response";
import { validateEnv } from "@/config/env.validation";
import { auth } from "@/auth";
import { BridgeModule } from "@/modules/bridge/bridge.module";
import { WalletModule } from "@/modules/wallet/wallet.module";
import { TransfersModule } from "@/modules/transfers/transfers.module";
import { PaymentsModule } from "@/modules/payments/payments.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { UserModule } from "@/modules/user/user.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DrizzleModule,
    AuthModule.forRoot({
      auth,
      middleware: wrapBaResponseMiddleware,
      bodyParser: {
        json: { limit: "1mb" },
        urlencoded: { limit: "1mb", extended: true },
      },
    }),
    BridgeModule,
    WalletModule,
    TransfersModule,
    PaymentsModule,
    NotificationsModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
