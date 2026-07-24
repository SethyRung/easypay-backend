import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '@/db/database.module';
import { notifications } from '@/db/schema';
import type { NotificationResponseDto } from './dto/notification.dto';

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listForUser(
    userId: string,
    unreadOnly: boolean,
  ): Promise<NotificationResponseDto[]> {
    const where = unreadOnly
      ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      : eq(notifications.userId, userId);
    const rows = await this.db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      type: r.type,
      timestamp: r.createdAt.getTime(),
      isRead: r.isRead,
    }));
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });
    return result.length > 0;
  }
}
