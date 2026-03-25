import { ApiProperty } from "@nestjs/swagger";

export class TopUpResponseDto {
  @ApiProperty({ description: "Wallet account ID" })
  walletId: string;

  @ApiProperty({ description: "Currency code", example: "USD" })
  currency: string;

  @ApiProperty({ description: "Credited amount in minor units", example: 10000 })
  amountMinor: number;

  @ApiProperty({ description: "Credited amount in major units", example: 100.0 })
  amount: number;

  @ApiProperty({ description: "Wallet balance before top-up in minor units", example: 5000 })
  balanceBeforeMinor: number;

  @ApiProperty({ description: "Wallet balance after top-up in minor units", example: 15000 })
  balanceAfterMinor: number;

  @ApiProperty({ description: "Ledger entry ID for this top-up" })
  transactionId: string;

  @ApiProperty({ description: "Timestamp when top-up was recorded" })
  createdAt: Date;
}
