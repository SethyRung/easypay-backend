import { Injectable, NotFoundException } from "@nestjs/common";
import { WalletService } from "@/modules/wallet/wallet.service";
import { BillPaymentDto } from "./dto/bill-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(private readonly walletService: WalletService) {}

  async payBill(userId: string, dto: BillPaymentDto) {
    const result = await this.walletService.withdrawWallet(userId, {
      amount: dto.amount,
      note: `Bill payment to ${dto.billerCode} (${dto.accountNumber}) ${dto.note ? `: ${dto.note}` : ""}`,
    } as any);

    if (!result) {
      throw new NotFoundException("Payment failed");
    }

    return {
      status: "success",
      wallet: {
        walletId: result.walletId,
        balanceBeforeMinor: result.balanceBeforeMinor,
        balanceAfterMinor: result.balanceAfterMinor,
      },
      payment: {
        billerCode: dto.billerCode,
        accountNumber: dto.accountNumber,
        amount: result.amount,
        transactionId: result.transactionId,
      },
    };
  }
}
