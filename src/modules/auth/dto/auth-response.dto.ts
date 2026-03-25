import { ApiProperty } from "@nestjs/swagger";

export class UserDataDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  id!: string;

  @ApiProperty({ example: "user@example.com" })
  email!: string;

  @ApiProperty({ example: "+1234567890" })
  phone!: string;

  @ApiProperty({ example: "John Doe" })
  name!: string;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserDataDto })
  user!: UserDataDto;

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken!: string;

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  refreshToken!: string;
}

export class UserResponseDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  id!: string;

  @ApiProperty({ example: "user@example.com" })
  email!: string;

  @ApiProperty({ example: "+1234567890" })
  phone!: string;

  @ApiProperty({ example: "John Doe" })
  name!: string;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  createdAt!: Date;
}

export class LogoutResponseDto {
  @ApiProperty({ example: "Logged out successfully" })
  message!: string;
}
