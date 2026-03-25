import { IsEmail, IsString, MinLength, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "+1234567890" })
  @IsString()
  @MinLength(10)
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: "Phone number must be in E.164 format" })
  phone!: string;

  @ApiProperty({ example: "John Doe" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "password123", minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
