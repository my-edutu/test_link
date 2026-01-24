import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class RegisterPushTokenDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^ExponentPushToken\[.+\]$/, {
        message: 'expoPushToken must be a valid Expo push token',
    })
    expoPushToken: string;
}

export class UnregisterPushTokenDto {
    @IsString()
    @IsNotEmpty()
    userId: string;
}
