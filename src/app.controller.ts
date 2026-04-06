import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { Public } from "@/common/decorators/public.decorator";
import { ApiOkResponseWrapper } from "./common/decorators/api-response.decorator";

@ApiTags("Health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get("api/ping")
  @ApiOperation({ summary: "Ping endpoint" })
  @ApiOkResponseWrapper(String)
  ping(): string {
    return this.appService.getPong();
  }
}
