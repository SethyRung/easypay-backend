import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { BridgeController } from "./bridge.controller";
import { BridgeIssueService } from "./bridge.service";
import { BridgeUserRepository } from "./bridge-user.repository";

@Module({
  imports: [HttpModule],
  controllers: [BridgeController],
  providers: [BridgeIssueService, BridgeUserRepository],
})
export class BridgeModule {}
