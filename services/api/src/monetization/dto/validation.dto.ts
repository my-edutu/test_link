import { IsBoolean, IsUUID, IsOptional, IsString } from 'class-validator';

/**
 * DTO for submitting a validation
 */
export class SubmitValidationDto {
    @IsUUID()
    voiceClipId: string;

    @IsBoolean()
    isApproved: boolean;

    @IsOptional()
    @IsString()
    feedback?: string; // Optional written feedback
}

/**
 * Response from submitting a validation
 */
export class ValidationResponseDto {
    success: boolean;
    validationId?: string;
    pointsEarned?: number;
    message: string;
    consensusReached?: boolean;
}

/**
 * DTO for fetching validation queue
 */
export class ValidationQueueItemDto {
    clipId: string;
    phrase: string;
    language: string;
    dialect?: string;
    audioUrl: string;
    currentValidationCount: number;
}
