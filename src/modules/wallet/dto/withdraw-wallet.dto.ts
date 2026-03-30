import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min, IsOptional, IsString, MaxLength } from "class-validator";

export class WithdrawWalletDto {
  @ApiProperty({
    description: "Withdraw amount in major units (e.g., dollars for USD)",
    example: 50.0,
    minimum: 0.01,
  })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: "Optional note for this withdrawal",
    example: "ATM cash-out",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
