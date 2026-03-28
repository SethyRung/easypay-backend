import { ApiProperty } from "@nestjs/swagger";

export class TransferReceiptDto {
  @ApiProperty({ description: "Transfer ID" })
  id: string;

  @ApiProperty({ description: "Sender user ID" })
  senderUserId: string;

  @ApiProperty({ description: "Recipient user ID" })
  recipientUserId: string;

  @ApiProperty({ description: "Amount transferred (minor units)" })
  amountMinor: number;

  @ApiProperty({ example: 130.0, description: "Amount transferred (major units)" })
  amount: number;

  @ApiProperty({ description: "Fee charged (minor units)" })
  feeMinor: number;

  @ApiProperty({ example: 2.0, description: "Fee charged (major units)" })
  fee: number;

  @ApiProperty({ description: "Total debit from sender (minor units)" })
  totalDebitMinor: number;

  @ApiProperty({ example: 132.0, description: "Total debit from sender (major units)" })
  totalDebit: number;

  @ApiProperty({ description: "Transfer status" })
  status: string;

  @ApiProperty({ description: "Idempotency key" })
  idempotencyKey: string;

  @ApiProperty({ description: "Transfer note", required: false })
  note?: string;

  @ApiProperty({ description: "Transfer timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Sender balance before transfer (minor units)" })
  senderBalanceBeforeMinor: number;

  @ApiProperty({ description: "Sender balance after transfer (minor units)" })
  senderBalanceAfterMinor: number;

  @ApiProperty({ description: "Recipient balance before transfer (minor units)" })
  recipientBalanceBeforeMinor: number;

  @ApiProperty({ description: "Recipient balance after transfer (minor units)" })
  recipientBalanceAfterMinor: number;
}
