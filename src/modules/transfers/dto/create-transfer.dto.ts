import { IsString, IsNumber, IsOptional, Min, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTransferDto {
  @ApiProperty({ example: "+919876543210", description: "Recipient phone number (E.164 format)" })
  @IsString()
  @Matches(/^\+\d{1,15}$/, { message: "Phone must be in E.164 format (e.g., +1234567890)" })
  recipientPhone: string;

  @ApiProperty({
    example: 130.0,
    description: "Amount to transfer in major units (e.g., dollars)",
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Idempotency key to prevent duplicate transfers",
  })
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({
    example: "Payment for dinner",
    description: "Optional note for the transfer",
  })
  @IsOptional()
  @IsString()
  note?: string;
}
