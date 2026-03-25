import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from "@nestjs/core";
import { AppController } from "@/app.controller";
import { AppService } from "@/app.service";
import { DrizzleModule } from "@db/drizzle.module";
import { ResponseInterceptor } from "@common/interceptors/response.interceptor";
import { HttpExceptionFilter } from "@common/filters/http-exception.filter";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { validateEnv } from "@config/env.validation";
import { AuthModule } from "@modules/auth/auth.module";
import { WalletModule } from "@modules/wallet/wallet.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DrizzleModule,
    AuthModule,
    WalletModule,
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
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
