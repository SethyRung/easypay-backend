import { Global, Module } from "@nestjs/common";
import { db } from "@/db";
import { DatabaseService } from "./database.service";

@Global()
@Module({
  providers: [{ provide: "DATABASE_CLIENT", useValue: db }, DatabaseService],
  exports: [DatabaseService, "DATABASE_CLIENT"],
})
export class DrizzleModule {}
