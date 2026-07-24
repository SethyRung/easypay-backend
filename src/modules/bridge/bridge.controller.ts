import { Controller, Post } from "@nestjs/common";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BridgeIssueService } from "./bridge.service";
import { BridgeIssueResponseDto } from "./dto/bridge-issue-response.dto";
import { ApiOkResponseWrapper } from "@/common/decorators/api-response.decorator";

@ApiTags("bridge")
@ApiBearerAuth()
@Controller("bridge")
export class BridgeController {
  constructor(private readonly bridgeIssueService: BridgeIssueService) {}

  @Post("issue")
  @ApiOkResponseWrapper(BridgeIssueResponseDto)
  async bridgeIssue(@Session() session: UserSession): Promise<BridgeIssueResponseDto> {
    return this.bridgeIssueService.issue(session.user.id);
  }
}
