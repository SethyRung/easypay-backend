import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: 'n_abc123' })
  id!: string;

  @ApiProperty({ example: 'Top-up successful' })
  title!: string;

  @ApiProperty({ example: 'You added 100.00 USD to your wallet.' })
  body!: string;

  @ApiProperty({ example: 'topup' })
  type!: string;

  @ApiProperty({ example: 1700000000000, description: 'epoch milliseconds' })
  timestamp!: number;

  @ApiProperty({ example: false })
  isRead!: boolean;
}

export class MarkReadResponseDto {
  @ApiProperty({ example: true })
  success!: true;
}
