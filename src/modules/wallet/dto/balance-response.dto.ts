import { ApiProperty } from "@nestjs/swagger";

export class BalanceResponseDto {
  @ApiProperty({ example: "USD", description: "Currency code" })
  currency: string;

  @ApiProperty({ example: 100000, description: "Balance in minor units (e.g., cents for USD)" })
  balanceMinor: number;

  @ApiProperty({ example: 1000.0, description: "Balance in major units (e.g., dollars)" })
  balance: number;
}
