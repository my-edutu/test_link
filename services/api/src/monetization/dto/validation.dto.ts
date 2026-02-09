import { IsBoolean, IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for submitting a validation
 */
export class SubmitValidationDto {
    @ApiProperty({ description: 'The UUID of the voice clip being validated' })
    @IsUUID()
    voiceClipId: string;

    @ApiProperty({ description: 'Whether the clip is valid/accurate' })
    @IsBoolean()
    isApproved: boolean;

    @ApiPropertyOptional({ description: 'Optional detailed feedback' })
    @IsOptional()
    @IsString()
    feedback?: string; // Optional written feedback
}

/**
 * Response from submitting a validation
 */
export class ValidationResponseDto {
    @ApiProperty()
    success: boolean;

    @ApiPropertyOptional()
    validationId?: string;

    @ApiPropertyOptional()
    pointsEarned?: number;

    @ApiProperty()
    message: string;

    @ApiPropertyOptional()
    consensusReached?: boolean;
}

/**
 * DTO for fetching validation queue
 */
export class ValidationQueueItemDto {
    @ApiProperty()
    clipId: string;

    @ApiProperty()
    phrase: string;

    @ApiProperty()
    language: string;

    @ApiPropertyOptional()
    dialect?: string;

    @ApiProperty()
    audioUrl: string;

    @ApiProperty()
    currentValidationCount: number;
}
