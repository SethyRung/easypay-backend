import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, Min, IsOptional } from "class-validator";

export class BillPaymentDto {
  @ApiProperty({ description: "Biller code or identifier" })
  @IsString()
  billerCode: string;

  @ApiProperty({ description: "Account number/reference at the biller" })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: "Amount to pay in major units", example: 120.5 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: "Optional note", required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
