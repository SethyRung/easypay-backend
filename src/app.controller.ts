import { Controller, Get } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { ApiOkResponseWrapper } from "./common/decorators/api-response.decorator";

@ApiTags("Health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @AllowAnonymous()
  @Get("ping")
  @ApiOperation({ summary: "Ping endpoint" })
  @ApiOkResponseWrapper(String)
  ping(): string {
    return this.appService.getPong();
  }
}
