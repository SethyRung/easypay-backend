import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { BillPaymentDto } from "./dto/bill-payment.dto";
import { CurrentUser, type CurrentUserData } from "@common/decorators/current-user.decorator";
import { ApiOkResponseWrapper } from "@common/decorators/api-response.decorator";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("bill")
  @ApiBearerAuth()
  @ApiBody({ type: BillPaymentDto })
  @ApiOkResponseWrapper(Object)
  async payBill(@CurrentUser() user: CurrentUserData, @Body() dto: BillPaymentDto) {
    return this.paymentsService.payBill(user.userId, dto);
  }
}
