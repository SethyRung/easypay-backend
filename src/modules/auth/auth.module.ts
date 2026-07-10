import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { BridgeIssueService } from "./bridge-issue";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_ACCESS_SECRET")!,
        signOptions: {
          expiresIn: configService.get("JWT_ACCESS_EXPIRATION")!,
        },
      }),
    }),
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy, BridgeIssueService],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
