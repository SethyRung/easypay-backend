import { ApiProperty } from "@nestjs/swagger";

export class BridgeIssueResponseDto {
  @ApiProperty()
  ticket!: string;
}
