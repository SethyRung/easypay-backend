import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WalletRepository } from "./wallet.repository";
import {
  TransactionsQueryDto,
  TransactionResponseDto,
  TopUpWalletDto,
  TopUpResponseDto,
} from "./dto";

@Injectable()
export class WalletService {
  private readonly topUpMaxPerTxMinor: number;
  private readonly topUpMaxDailyMinor: number;

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly configService: ConfigService,
  ) {
    this.topUpMaxPerTxMinor = Number(this.configService.get("TOPUP_MAX_PER_TX_MINOR") || "100000");
    this.topUpMaxDailyMinor = Number(this.configService.get("TOPUP_MAX_DAILY_MINOR") || "500000");
  }

  async getBalance(userId: string) {
    const wallet = await this.walletRepository.findWalletByUserId(userId);
    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    return {
      currency: wallet.currency,
      balanceMinor: wallet.balanceMinor,
      balance: wallet.balanceMinor / 100,
    };
  }

  async getTransactions(userId: string, query: TransactionsQueryDto) {
    const wallet = await this.walletRepository.findWalletByUserId(userId);
    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    const { transactions, total } = await this.walletRepository.getTransactionHistory(
      wallet.id,
      query.limit || 10,
      query.offset || 0,
    );

    const transactionDtos: TransactionResponseDto[] = transactions.map((t) => ({
      id: t.id,
      type: t.entryType,
      amountMinor: t.amountMinor,
      amount: t.amountMinor / 100,
      balanceBeforeMinor: t.balanceBeforeMinor,
      balanceAfterMinor: t.balanceAfterMinor,
      description: t.description || undefined,
      transferId: t.transferId || undefined,
      createdAt: t.createdAt,
    }));

    return {
      transactions: transactionDtos,
      total,
      limit: query.limit || 10,
      offset: query.offset || 0,
    };
  }

  async topUpWallet(userId: string, dto: TopUpWalletDto): Promise<TopUpResponseDto> {
    if (typeof dto.amount !== "number" || !Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException("amount must be a positive number");
    }

    const amountMinor = Math.round(dto.amount * 100);
    if (amountMinor <= 0) {
      throw new BadRequestException("amount must be at least 0.01");
    }

    if (amountMinor > this.topUpMaxPerTxMinor) {
      throw new BadRequestException(
        `Top-up exceeds per transaction limit of ${this.topUpMaxPerTxMinor} minor units`,
      );
    }

    const result = await this.walletRepository.topUpWallet(
      userId,
      amountMinor,
      this.topUpMaxDailyMinor,
      dto.note,
    );

    if (!result) {
      throw new NotFoundException("Wallet not found");
    }

    return {
      walletId: result.wallet.id,
      currency: result.wallet.currency,
      amountMinor,
      amount: amountMinor / 100,
      balanceBeforeMinor: result.balanceBeforeMinor,
      balanceAfterMinor: result.wallet.balanceMinor,
      transactionId: result.entry.id,
      createdAt: result.entry.createdAt,
    };
  }
}
