import { ApiProperty } from "@nestjs/swagger";

export class BridgeIssueResponseDto {
  @ApiProperty({
    description:
      "Full Set-Cookie header value returned by glitch. Forward verbatim to glitch when opening the web store.",
    example: "session=eyJhbGciOiJIUzI1NiJ9...; Path=/; HttpOnly; SameSite=Lax",
  })
  cookie!: string;
}
