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
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser, type CurrentUserData } from "@/common/decorators/current-user.decorator";
import { ApiOkResponseWrapper } from "@/common/decorators/api-response.decorator";
import { ApiTags, ApiBody, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("auth")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiBody({ type: RegisterDto })
  @ApiOkResponseWrapper(AuthResponseDto)
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @ApiBody({ type: LoginDto })
  @ApiOkResponseWrapper(AuthResponseDto)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post("refresh")
  @ApiBody({ type: RefreshDto })
  @ApiOkResponseWrapper(AuthResponseDto)
  async refreshToken(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto);
  }

  @Post("logout")
  @ApiBearerAuth()
  @ApiBody({ type: LogoutDto })
  @ApiOkResponseWrapper(LogoutResponseDto)
  async logout(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: LogoutDto,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(user.userId, dto.refreshToken);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOkResponseWrapper(UserResponseDto)
  async getMe(@CurrentUser() user: CurrentUserData): Promise<UserResponseDto> {
    return this.authService.getMe(user.userId);
  }
}
