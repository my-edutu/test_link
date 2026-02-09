import { Controller, Post, Body, Get, UseGuards, Logger } from '@nestjs/common';
import { LiveService } from './live.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard, CurrentUser, AuthUser, Public } from '../auth';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

/**
 * Live Streaming Controller
 * Handles LiveKit token generation and stream management.
 * 
 * SECURITY: All endpoints require JWT authentication except /discover (public).
 */
@ApiTags('Live')
@ApiBearerAuth()
@Controller('live')
@UseGuards(JwtAuthGuard)
export class LiveController {
    private readonly logger = new Logger(LiveController.name);

    constructor(
        private readonly liveService: LiveService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Generate a LiveKit token for joining a room.
     * POST /live/token
     */
    @Post('token')
    @ApiOperation({ summary: 'Generate LiveKit token for room participation' })
    @ApiBody({ schema: { type: 'object', properties: { roomName: { type: 'string' }, participantName: { type: 'string' } } } })
    async getToken(
        @CurrentUser() user: AuthUser,
        @Body() body: { roomName: string; participantName: string },
    ) {
        this.logger.log(`Token request from user ${user.id} for room ${body.roomName}`);
        const token = await this.liveService.generateToken(body.roomName, body.participantName);
        const serverUrl = this.configService.get<string>('LIVEKIT_URL');
        return { token, serverUrl };
    }

    /**
     * Generate a LiveKit token for a video call.
     * POST /live/call-token
     */
    @Post('call-token')
    @ApiOperation({ summary: 'Generate token for video call' })
    @ApiBody({ schema: { type: 'object', properties: { callId: { type: 'string' }, participantId: { type: 'string' }, isHost: { type: 'boolean' } } } })
    async getCallToken(
        @CurrentUser() user: AuthUser,
        @Body() body: { callId: string; participantId: string; isHost: boolean },
    ) {
        const { callId, participantId, isHost } = body;
        const roomName = `call_${callId}`;
        this.logger.log(`Call token request from user ${user.id} for call ${callId}`);
        const token = await this.liveService.generateToken(roomName, participantId);
        const serverUrl = this.configService.get<string>('LIVEKIT_URL');
        return { token, serverUrl };
    }

    /**
     * Start a new live stream.
     * POST /live/start
     */
    @Post('start')
    @ApiOperation({ summary: 'Start a new live stream' })
    @ApiBody({ schema: { type: 'object', properties: { title: { type: 'string' }, roomName: { type: 'string', nullable: true }, language: { type: 'string', nullable: true } } } })
    async startStream(
        @CurrentUser() user: AuthUser,
        @Body() body: { title: string; roomName?: string; language?: string },
    ) {
        this.logger.log(`Starting stream for user ${user.id}: ${body.title} (${body.language || 'English'})`);
        // Use authenticated user's ID instead of trusting body.userId
        return this.liveService.startStream(user.id, body.title, body.roomName, body.language);
    }

    /**
     * End a live stream.
     * POST /live/end
     */
    @Post('end')
    @ApiOperation({ summary: 'End a live stream' })
    @ApiBody({ schema: { type: 'object', properties: { roomId: { type: 'string' } } } })
    async endStream(
        @CurrentUser() user: AuthUser,
        @Body() body: { roomId: string },
    ) {
        this.logger.log(`User ${user.id} ending stream ${body.roomId}`);
        await this.liveService.endStream(body.roomId);
        return { success: true };
    }

    /**
     * Discover active live streams.
     * GET /live/discover
     * 
     * PUBLIC: This endpoint is accessible without authentication
     * to allow unauthenticated users to browse available streams.
     */
    @Get('discover')
    @Public()
    @ApiOperation({ summary: 'Discover active live streams' })
    async getDiscover() {
        return this.liveService.getActiveStreams();
    }

    /**
     * Update viewer count for a stream.
     * POST /live/count
     */
    @Post('count')
    @ApiOperation({ summary: 'Update viewer count for a stream' })
    @ApiBody({ schema: { type: 'object', properties: { roomId: { type: 'string' }, count: { type: 'number' } } } })
    async updateCount(
        @CurrentUser() user: AuthUser,
        @Body() body: { roomId: string; count: number },
    ) {
        await this.liveService.updateViewerCount(body.roomId, body.count);
        return { success: true };
    }

    // ==================== Call History Endpoints ====================

    /**
     * Log call start.
     * POST /live/call/start
     */
    @Post('call/start')
    @ApiOperation({ summary: 'Log a call start' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                callId: { type: 'string' },
                receiverId: { type: 'string' },
                callType: { type: 'string', enum: ['video', 'voice', 'group'] }
            }
        }
    })
    async startCall(
        @CurrentUser() user: AuthUser,
        @Body() body: { callId: string; receiverId: string; callType: 'video' | 'voice' | 'group' },
    ) {
        this.logger.log(`User ${user.id} starting ${body.callType} call to ${body.receiverId}`);
        const record = await this.liveService.startCall(body.callId, user.id, body.receiverId, body.callType);
        return { success: true, callHistoryId: record.id };
    }

    /**
     * Log call answered.
     * POST /live/call/answer
     */
    @Post('call/answer')
    @ApiOperation({ summary: 'Log a call being answered' })
    @ApiBody({ schema: { type: 'object', properties: { callId: { type: 'string' } } } })
    async answerCall(
        @CurrentUser() user: AuthUser,
        @Body() body: { callId: string },
    ) {
        this.logger.log(`Call ${body.callId} answered`);
        await this.liveService.answerCall(body.callId);
        return { success: true };
    }

    /**
     * Log call ended.
     * POST /live/call/end
     */
    @Post('call/end')
    @ApiOperation({ summary: 'Log a call ending' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                callId: { type: 'string' },
                endReason: { type: 'string', enum: ['completed', 'caller_ended', 'receiver_ended', 'missed', 'declined', 'failed'] }
            }
        }
    })
    async endCall(
        @CurrentUser() user: AuthUser,
        @Body() body: { callId: string; endReason: string },
    ) {
        this.logger.log(`Call ${body.callId} ended: ${body.endReason}`);
        await this.liveService.endCall(body.callId, body.endReason);
        return { success: true };
    }

    /**
     * Get user's call history.
     * GET /live/call/history
     */
    @Get('call/history')
    @ApiOperation({ summary: 'Get call history for the authenticated user' })
    async getCallHistory(@CurrentUser() user: AuthUser) {
        this.logger.log(`Fetching call history for user ${user.id}`);
        const history = await this.liveService.getUserCallHistory(user.id);
        return { history };
    }
}
