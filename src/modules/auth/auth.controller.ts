import { Controller, Post, Get, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  RegisterDto,
  LoginDto,
  RefreshDto,
  LogoutDto,
  AuthResponseDto,
  UserResponseDto,
  LogoutResponseDto,
} from "./dto";
import { Public } from "@common/decorators/public.decorator";
import { CurrentUser, type CurrentUserData } from "@common/decorators/current-user.decorator";
import { ApiTags, ApiOkResponse, ApiBody } from "@nestjs/swagger";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ description: "User registered successfully", type: AuthResponseDto })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: "Login successful", type: AuthResponseDto })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post("refresh")
  @ApiBody({ type: RefreshDto })
  @ApiOkResponse({
    description: "Token refreshed successfully",
    type: AuthResponseDto,
  })
  async refreshToken(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto);
  }

  @Post("logout")
  @ApiBody({ type: LogoutDto })
  @ApiOkResponse({ description: "Logout successful", type: LogoutResponseDto })
  async logout(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: LogoutDto,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(user.userId, dto.refreshToken);
  }

  @Get("me")
  @ApiOkResponse({
    description: "User retrieved successfully",
    type: UserResponseDto,
  })
  async getMe(@CurrentUser() user: CurrentUserData): Promise<UserResponseDto> {
    return this.authService.getMe(user.userId);
  }
}
