import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";

@ApiTags("Health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("ping")
  @ApiOperation({ summary: "Ping endpoint" })
  @ApiResponse({ status: 200, description: "pong response" })
  ping(): string {
    return this.appService.getPong();
  }
}
