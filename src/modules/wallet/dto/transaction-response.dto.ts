import { ApiProperty } from "@nestjs/swagger";

export class TransactionResponseDto {
  @ApiProperty({ description: "Transaction ID" })
  id: string;

  @ApiProperty({ enum: ["credit", "debit"], description: "Transaction type" })
  type: string;

  @ApiProperty({ description: "Amount in minor units" })
  amountMinor: number;

  @ApiProperty({ example: 1000.0, description: "Amount in major units" })
  amount: number;

  @ApiProperty({ description: "Balance before transaction (minor units)" })
  balanceBeforeMinor: number;

  @ApiProperty({ description: "Balance after transaction (minor units)" })
  balanceAfterMinor: number;

  @ApiProperty({ description: "Transaction description", required: false })
  description?: string;

  @ApiProperty({ description: "Related transfer ID (if applicable)", required: false })
  transferId?: string;

  @ApiProperty({ description: "Transaction timestamp" })
  createdAt: Date;
}

export class TransactionsResponseDto {
  @ApiProperty({ type: [TransactionResponseDto], description: "List of transactions" })
  transactions: TransactionResponseDto[];

  @ApiProperty({ description: "Total count of transactions" })
  total: number;

  @ApiProperty({ description: "Items per page" })
  limit: number;

  @ApiProperty({ description: "Items skipped" })
  offset: number;
}
