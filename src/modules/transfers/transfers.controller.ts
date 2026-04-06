import { Controller, Post, Get, Body, Param } from "@nestjs/common";
import { TransfersService } from "./transfers.service";
import { CurrentUser, type CurrentUserData } from "@/common/decorators/current-user.decorator";
import { ApiOkResponseWrapper } from "@/common/decorators/api-response.decorator";
import { ApiTags, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { CreateTransferDto, TransferReceiptDto } from "./dto";

@ApiTags("transfers")
@Controller("api/transfers")
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiBearerAuth()
  @ApiBody({ type: CreateTransferDto })
  @ApiOkResponseWrapper(TransferReceiptDto)
  async createTransfer(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferReceiptDto> {
    return this.transfersService.createTransfer(user.userId, dto);
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOkResponseWrapper(TransferReceiptDto)
  async getTransfer(@Param("id") id: string): Promise<TransferReceiptDto> {
    return this.transfersService.getTransfer(id);
  }
}
