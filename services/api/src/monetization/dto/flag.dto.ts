import { IsUUID, IsString, IsOptional } from 'class-validator';

/**
 * DTO for flagging a clip for admin review
 */
export class FlagClipDto {
    @IsUUID()
    voiceClipId: string;

    @IsString()
    reason: string; // 'unclear_audio', 'dialect_dispute', 'inappropriate_content', 'other'

    @IsOptional()
    @IsString()
    additionalNotes?: string;
}
