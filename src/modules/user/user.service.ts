import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "./user.repository";
import type { UserProfileDto } from "./dto/user-profile.dto";

@Injectable()
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const row = await this.repo.findById(userId);
    if (!row) {
      throw new NotFoundException("User not found");
    }
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? null,
      balance: (row.balanceMinor ?? 0) / 100,
      avatarUrl: row.image ?? null,
    };
  }
}
