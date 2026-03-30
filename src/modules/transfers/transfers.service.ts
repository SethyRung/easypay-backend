import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "@db/database.service";
import { TransfersRepository } from "./transfers.repository";
import { transfers, ledgerEntries, walletAccounts } from "@db/schema";
import { eq } from "drizzle-orm";
import { CreateTransferDto, TransferReceiptDto } from "./dto";

@Injectable()
export class TransfersService {
  private readonly feeMinor: number;

  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.feeMinor = Number(this.configService.get("TRANSFER_FEE_MINOR") || "200");
  }

  async createTransfer(senderUserId: string, dto: CreateTransferDto): Promise<TransferReceiptDto> {
    // Validate and convert amount to minor units
    if (typeof dto.amount !== "number" || !Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException("amount must be a positive number");
    }

    const amountMinor = Math.round(dto.amount * 100);
    if (amountMinor <= 0) {
      throw new BadRequestException("amount must be at least 0.01");
    }

    const existingTransfer = await this.transfersRepository.findTransferByIdempotency(
      senderUserId,
      dto.idempotencyKey,
    );
    if (existingTransfer) {
      return this.mapToReceipt(existingTransfer);
    }

    const recipient = await this.transfersRepository.findByPhone(dto.recipientPhone);
    if (!recipient) {
      throw new NotFoundException("Recipient not found");
    }

    if (senderUserId === recipient.id) {
      throw new BadRequestException("Cannot transfer to yourself");
    }

    const totalDebitMinor = amountMinor + this.feeMinor;

    return this.databaseService.transaction(async (db) => {
      const senderWalletResult = await db
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, senderUserId))
        .for("update")
        .limit(1);
      const senderWallet = senderWalletResult[0];

      if (!senderWallet) {
        throw new NotFoundException("Sender wallet not found");
      }

      const recipientWalletResult = await db
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, recipient.id))
        .for("update")
        .limit(1);
      const recipientWallet = recipientWalletResult[0];

      if (!recipientWallet) {
        throw new NotFoundException("Recipient wallet not found");
      }

      if (senderWallet.balanceMinor < totalDebitMinor) {
        throw new BadRequestException("Insufficient balance");
      }

      const transferResult = await db
        .insert(transfers)
        .values({
          senderUserId,
          recipientUserId: recipient.id,
          amountMinor: amountMinor,
          feeMinor: this.feeMinor,
          totalDebitMinor,
          status: "completed",
          idempotencyKey: dto.idempotencyKey,
          note: dto.note,
        })
        .returning();
      const transfer = transferResult[0];

      const senderDebitBalanceAfter = senderWallet.balanceMinor - amountMinor - this.feeMinor;
      await db.insert(ledgerEntries).values({
        walletAccountId: senderWallet.id,
        transferId: transfer.id,
        entryType: "debit",
        amountMinor: amountMinor,
        balanceBeforeMinor: senderWallet.balanceMinor,
        balanceAfterMinor: senderDebitBalanceAfter,
        description: dto.note
          ? `Transfer to ${dto.recipientPhone}: ${dto.note}`
          : `Transfer to ${dto.recipientPhone}`,
      });

      await db.insert(ledgerEntries).values({
        walletAccountId: senderWallet.id,
        transferId: transfer.id,
        entryType: "debit",
        amountMinor: this.feeMinor,
        balanceBeforeMinor: senderDebitBalanceAfter + this.feeMinor,
        balanceAfterMinor: senderDebitBalanceAfter,
        description: "Transfer fee",
      });

      const recipientCreditBalanceAfter = recipientWallet.balanceMinor + amountMinor;
      await db.insert(ledgerEntries).values({
        walletAccountId: recipientWallet.id,
        transferId: transfer.id,
        entryType: "credit",
        amountMinor: amountMinor,
        balanceBeforeMinor: recipientWallet.balanceMinor,
        balanceAfterMinor: recipientCreditBalanceAfter,
        description: dto.note ? `Transfer from sender: ${dto.note}` : "Transfer received",
      });

      await db
        .update(walletAccounts)
        .set({ balanceMinor: senderDebitBalanceAfter, updatedAt: new Date() })
        .where(eq(walletAccounts.id, senderWallet.id));

      await db
        .update(walletAccounts)
        .set({ balanceMinor: recipientCreditBalanceAfter, updatedAt: new Date() })
        .where(eq(walletAccounts.id, recipientWallet.id));

      return this.mapToReceipt({
        ...transfer,
        senderBalanceBeforeMinor: senderWallet.balanceMinor,
        senderBalanceAfterMinor: senderDebitBalanceAfter,
        recipientBalanceBeforeMinor: recipientWallet.balanceMinor,
        recipientBalanceAfterMinor: recipientCreditBalanceAfter,
      });
    });
  }

  async getTransfer(transferId: string): Promise<TransferReceiptDto> {
    const transfer = await this.transfersRepository.findTransferById(transferId);
    if (!transfer) {
      throw new NotFoundException("Transfer not found");
    }

    // Get ledger entries to find balances
    const senderDebitEntries = await this.databaseService
      .getClient()
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.transferId, transferId));

    // Find the main debit entry (not the fee entry) by selecting the largest amount
    const senderDebit = senderDebitEntries
      .filter((e) => e.entryType === "debit")
      .sort((a, b) => b.amountMinor - a.amountMinor)[0];

    const recipientCredit = senderDebitEntries.find((e) => e.entryType === "credit");

    return this.mapToReceipt({
      ...transfer,
      senderBalanceBeforeMinor: senderDebit?.balanceBeforeMinor || 0,
      senderBalanceAfterMinor: senderDebit?.balanceAfterMinor || 0,
      recipientBalanceBeforeMinor: recipientCredit?.balanceBeforeMinor || 0,
      recipientBalanceAfterMinor: recipientCredit?.balanceAfterMinor || 0,
    });
  }

  private mapToReceipt(transfer: any): TransferReceiptDto {
    return {
      id: transfer.id,
      senderUserId: transfer.senderUserId,
      recipientUserId: transfer.recipientUserId,
      amountMinor: transfer.amountMinor,
      amount: transfer.amountMinor / 100,
      feeMinor: transfer.feeMinor,
      fee: transfer.feeMinor / 100,
      totalDebitMinor: transfer.totalDebitMinor,
      totalDebit: transfer.totalDebitMinor / 100,
      status: transfer.status,
      idempotencyKey: transfer.idempotencyKey,
      note: transfer.note || undefined,
      createdAt: transfer.createdAt,
      senderBalanceBeforeMinor: transfer.senderBalanceBeforeMinor,
      senderBalanceAfterMinor: transfer.senderBalanceAfterMinor,
      recipientBalanceBeforeMinor: transfer.recipientBalanceBeforeMinor,
      recipientBalanceAfterMinor: transfer.recipientBalanceAfterMinor,
    };
  }
}
