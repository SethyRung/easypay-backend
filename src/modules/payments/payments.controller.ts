import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { BillPaymentDto } from "./dto/bill-payment.dto";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ApiOkResponseWrapper } from "@/common/decorators/api-response.decorator";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("bill")
  @ApiBearerAuth()
  @ApiBody({ type: BillPaymentDto })
  @ApiOkResponseWrapper(Object)
  async payBill(@Session() session: UserSession, @Body() dto: BillPaymentDto) {
    return this.paymentsService.payBill(session.user.id, dto);
  }
}
