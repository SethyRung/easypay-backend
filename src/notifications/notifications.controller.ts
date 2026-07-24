import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiOkResponseWrapper } from '@/common/decorators/api-response.decorator';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { NotificationsService } from './notifications.service';
import {
  MarkReadResponseDto,
  NotificationResponseDto,
} from './dto/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOkResponseWrapper(NotificationResponseDto)
  list(
    @Session() session: UserSession,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationsService.list(
      session.user.id,
      unreadOnly === 'true' || unreadOnly === '1',
    );
  }

  @Post(':id/read')
  @ApiOkResponseWrapper(MarkReadResponseDto)
  markRead(
    @Session() session: UserSession,
    @Param('id') id: string,
  ): Promise<MarkReadResponseDto> {
    return this.notificationsService.markRead(session.user.id, id);
  }
}
