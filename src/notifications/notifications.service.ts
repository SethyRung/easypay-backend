import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import type {
  MarkReadResponseDto,
  NotificationResponseDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  async list(
    userId: string,
    unreadOnly: boolean,
  ): Promise<NotificationResponseDto[]> {
    return this.repo.listForUser(userId, unreadOnly);
  }

  async markRead(userId: string, id: string): Promise<MarkReadResponseDto> {
    const ok = await this.repo.markRead(userId, id);
    if (!ok) {
      throw new NotFoundException('Notification not found');
    }
    return { success: true };
  }
}
