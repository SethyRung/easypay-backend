import { ApiProperty } from "@nestjs/swagger";

export class WithdrawResponseDto {
  @ApiProperty({ description: "Wallet account ID" })
  walletId: string;

  @ApiProperty({ description: "Currency code", example: "USD" })
  currency: string;

  @ApiProperty({ description: "Debited amount in minor units", example: 5000 })
  amountMinor: number;

  @ApiProperty({ description: "Debited amount in major units", example: 50.0 })
  amount: number;

  @ApiProperty({ description: "Wallet balance before withdrawal in minor units", example: 15000 })
  balanceBeforeMinor: number;

  @ApiProperty({ description: "Wallet balance after withdrawal in minor units", example: 10000 })
  balanceAfterMinor: number;

  @ApiProperty({ description: "Ledger entry ID for this withdrawal" })
  transactionId: string;

  @ApiProperty({ description: "Timestamp when withdrawal was recorded" })
  createdAt: Date;
}
