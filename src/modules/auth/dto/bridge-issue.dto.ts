import { ApiProperty } from "@nestjs/swagger";

/**
 * Response shape for `POST /api/auth/bridge-issue`.
 *
 * The `cookie` field carries the full `Set-Cookie` header value that
 * glitch returned (e.g. `"session=abc123; Path=/; HttpOnly"`). The
 * mobile client should forward it verbatim when opening the glitch
 * web store.
 */
export class BridgeIssueResponseDto {
  @ApiProperty({
    description:
      "Full Set-Cookie header value returned by glitch. Forward verbatim to glitch when opening the web store.",
    example: "session=eyJhbGciOiJIUzI1NiJ9...; Path=/; HttpOnly; SameSite=Lax",
  })
  cookie: string;
}
