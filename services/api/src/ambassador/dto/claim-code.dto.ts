import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ClaimCodeDto {
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Code can only contain letters, numbers, underscores and dashes' })
    code: string;
}
