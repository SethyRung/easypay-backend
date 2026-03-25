import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min, IsOptional, IsString, MaxLength } from "class-validator";

export class TopUpWalletDto {
  @ApiProperty({
    description: "Top-up amount in major units (e.g., dollars for USD)",
    example: 100.5,
    minimum: 0.01,
  })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: "Optional note for this top-up",
    example: "Add money from bank transfer",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
