import { Controller, Post, Body, Get } from '@nestjs/common';
import { LiveService } from './live.service';
import { ConfigService } from '@nestjs/config';

@Controller('live')
export class LiveController {
    constructor(
        private readonly liveService: LiveService,
        private readonly configService: ConfigService,
    ) { }

    @Post('token')
    async getToken(@Body() body: { roomName: string; participantName: string }) {
        const token = await this.liveService.generateToken(body.roomName, body.participantName);
        const serverUrl = this.configService.get<string>('LIVEKIT_URL');
        return { token, serverUrl };
    }

    @Post('call-token')
    async getCallToken(@Body() body: { callId: string; participantId: string; isHost: boolean }) {
        const { callId, participantId, isHost } = body;
        const roomName = `call_${callId}`;
        const token = await this.liveService.generateToken(roomName, participantId);
        const serverUrl = this.configService.get<string>('LIVEKIT_URL');
        return { token, serverUrl };
    }

    @Post('start')
    async startStream(@Body() body: { userId: string; title: string; roomName?: string }) {
        return this.liveService.startStream(body.userId, body.title, body.roomName);
    }

    @Post('end')
    async endStream(@Body() body: { roomId: string }) {
        await this.liveService.endStream(body.roomId);
        return { success: true };
    }

    @Get('discover')
    async getDiscover() {
        return this.liveService.getActiveStreams();
    }

    @Post('count')
    async updateCount(@Body() body: { roomId: string; count: number }) {
        await this.liveService.updateViewerCount(body.roomId, body.count);
        return { success: true };
    }
}
