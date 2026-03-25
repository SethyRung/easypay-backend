import { Injectable, ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthRepository } from "./auth.repository";
import { RegisterDto, LoginDto, RefreshDto } from "./dto";
import { DatabaseService } from "@db/database.service";
import { walletAccounts } from "@db/schema";
import type { RefreshToken } from "@db/schema/refresh-tokens";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async register(dto: RegisterDto) {
    const existingByEmail = await this.authRepository.findByEmail(dto.email);
    if (existingByEmail) {
      throw new ConflictException("User with this email already exists");
    }

    const existingByPhone = await this.authRepository.findByPhone(dto.phone);
    if (existingByPhone) {
      throw new ConflictException("User with this phone number already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.databaseService.transaction(async (db) => {
      const user = await this.authRepository.createUser({
        email: dto.email,
        phone: dto.phone,
        name: dto.name,
        passwordHash,
      });

      await db.insert(walletAccounts).values({
        userId: user.id,
        currency: "INR",
        balanceMinor: 0,
        status: "active",
      });

      return user;
    });

    const { accessToken, refreshToken } = await this.generateTokens(result.id, result.email);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.authRepository.createRefreshToken({
      userId: result.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    return {
      user: {
        id: result.id,
        email: result.email,
        phone: result.phone,
        name: result.name,
        createdAt: result.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(dto: RefreshDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.authRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const refreshTokenRecords = await this.authRepository.findValidRefreshTokens(payload.sub);

    let matchingRecord: RefreshToken | null = null;
    for (const record of refreshTokenRecords) {
      const isValid = await bcrypt.compare(dto.refreshToken, record.tokenHash);
      if (isValid) {
        matchingRecord = record;
        break;
      }
    }

    if (!matchingRecord) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (matchingRecord.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    await this.authRepository.revokeRefreshToken(matchingRecord.id);

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email);

    const newRefreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: string, refreshToken: string) {
    const refreshTokenRecords = await this.authRepository.findValidRefreshTokens(userId);

    for (const record of refreshTokenRecords) {
      const isValid = await bcrypt.compare(refreshToken, record.tokenHash);
      if (isValid) {
        await this.authRepository.revokeRefreshToken(record.id);
        break;
      }
    }

    return { message: "Logged out successfully" };
  }

  async getMe(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get("JWT_ACCESS_SECRET")!,
      expiresIn: this.configService.get("JWT_ACCESS_EXPIRATION")!,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get("JWT_REFRESH_SECRET")!,
      expiresIn: this.configService.get("JWT_REFRESH_EXPIRATION")!,
    });

    return { accessToken, refreshToken };
  }
}
