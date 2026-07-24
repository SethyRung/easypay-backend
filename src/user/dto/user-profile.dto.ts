import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ example: 'n_abc123' })
  id!: string;

  @ApiProperty({ example: 'Sethy' })
  name!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: '+15555550100', nullable: true })
  phone!: string | null;

  @ApiProperty({
    example: 0.0,
    description:
      'balance in major units (e.g. dollars), computed as balanceMinor / 100',
  })
  balance!: number;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl!: string | null;
}
