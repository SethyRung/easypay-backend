import { Controller, Post, Get, Body, Param } from "@nestjs/common";
import { TransfersService } from "./transfers.service";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ApiOkResponseWrapper } from "@/common/decorators/api-response.decorator";
import { ApiTags, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { CreateTransferDto, TransferReceiptDto } from "./dto";

@ApiTags("transfers")
@Controller("transfers")
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiBearerAuth()
  @ApiBody({ type: CreateTransferDto })
  @ApiOkResponseWrapper(TransferReceiptDto)
  async createTransfer(
    @Session() session: UserSession,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferReceiptDto> {
    return this.transfersService.createTransfer(session.user.id, dto);
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOkResponseWrapper(TransferReceiptDto)
  async getTransfer(@Param("id") id: string): Promise<TransferReceiptDto> {
    return this.transfersService.getTransfer(id);
  }
}
