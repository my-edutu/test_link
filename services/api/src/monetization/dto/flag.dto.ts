import { IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for flagging a clip for admin review
 */
export class FlagClipDto {
    @ApiProperty({ description: 'UUID of the clip to flag' })
    @IsUUID()
    voiceClipId: string;

    @ApiProperty({
        description: 'Reason for flagging',
        example: 'unclear_audio'
    })
    @IsString()
    reason: string; // 'unclear_audio', 'dialect_dispute', 'inappropriate_content', 'other'

    @ApiPropertyOptional({ description: 'Additional context for the reviewer' })
    @IsOptional()
    @IsString()
    additionalNotes?: string;
}
