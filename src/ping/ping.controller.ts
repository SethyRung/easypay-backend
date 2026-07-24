import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkResponseWrapper } from '@/common/decorators/api-response.decorator';
import { PingService } from './ping.service';

@ApiTags()
@Controller('ping')
export class PingController {
  constructor(private readonly pingService: PingService) {}

  @AllowAnonymous()
  @Get()
  @ApiOperation({ summary: 'Ping endpoint' })
  @ApiOkResponseWrapper(String)
  findAll() {
    return this.pingService.findAll();
  }
}
