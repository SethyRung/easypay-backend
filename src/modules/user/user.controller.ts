import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiOkResponseWrapper } from "@/common/decorators/api-response.decorator";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { UserService } from "./user.service";
import { UserProfileDto } from "./dto/user-profile.dto";

@ApiTags("users")
@ApiBearerAuth()
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("profile")
  @ApiOkResponseWrapper(UserProfileDto)
  getProfile(@Session() session: UserSession): Promise<UserProfileDto> {
    return this.userService.getProfile(session.user.id);
  }
}
