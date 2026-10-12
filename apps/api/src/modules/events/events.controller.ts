import { Controller, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, interval, map } from 'rxjs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@registro/shared';

@ApiTags('Realtime Events')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  @Sse()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Server-Sent Events (SSE) realtime channel' })
  streamEvents(): Observable<MessageEvent> {
    // Heartbeat every 25s with event payload
    return interval(25000).pipe(
      map(() => ({
        data: { type: 'HEARTBEAT', timestamp: new Date().toISOString() },
      })),
    );
  }
}
