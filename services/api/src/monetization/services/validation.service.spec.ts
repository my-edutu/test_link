import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import { ConsensusService } from './consensus.service';
import { PayoutService } from './payout.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubmitValidationDto } from '../dto/validation.dto';
import { MONETIZATION_ERRORS } from '../constants';

const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
};

const mockConsensusService = {
    checkConsensus: jest.fn(),
};

const mockPayoutService = {};

const mockEventEmitter = {
    emit: jest.fn(),
};

describe('ValidationService', () => {
    let service: ValidationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ValidationService,
                {
                    provide: 'DRIZZLE',
                    useValue: mockDb,
                },
                {
                    provide: ConsensusService,
                    useValue: mockConsensusService,
                },
                {
                    provide: PayoutService,
                    useValue: mockPayoutService,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<ValidationService>(ValidationService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('submitValidation', () => {
        const validatorId = 'validator-uuid';
        const dto: SubmitValidationDto = {
            voiceClipId: 'clip-uuid',
            isApproved: true,
            feedback: 'Good',
        };

        it('should throw NotFoundException if clip not found', async () => {
            mockDb.limit.mockResolvedValue([]); // No clips found

            await expect(service.submitValidation(validatorId, dto)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw ForbiddenException if validating own clip', async () => {
            mockDb.limit.mockResolvedValueOnce([{ id: 'clip-uuid', userId: validatorId }]); // Own clip

            await expect(service.submitValidation(validatorId, dto)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('should throw BadRequestException if already validated', async () => {
            mockDb.limit
                .mockResolvedValueOnce([{ id: 'clip-uuid', userId: 'other-user' }]) // Clip exists
                .mockResolvedValueOnce([{ id: 'validation-id' }]); // Already validated

            await expect(service.submitValidation(validatorId, dto)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should successfully submit validation', async () => {
            mockDb.limit
                .mockResolvedValueOnce([{ id: 'clip-uuid', userId: 'other-user', validationsCount: 0 }]) // Clip exists
                .mockResolvedValueOnce([]) // Not validated yet
                .mockResolvedValueOnce([{ trustScore: 100 }]); // Good trust score

            mockDb.returning.mockResolvedValueOnce([{ id: 'new-validation-id' }]);
            mockConsensusService.checkConsensus.mockResolvedValue({ consensusReached: false });

            const result = await service.submitValidation(validatorId, dto);

            expect(result.success).toBe(true);
            expect(result.validationId).toBe('new-validation-id');
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('validation.processed', { validatorId });
        });
    });
});
