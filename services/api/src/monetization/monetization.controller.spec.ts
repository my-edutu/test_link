import { Test, TestingModule } from '@nestjs/testing';
import { MonetizationController } from './monetization.controller';
import { ValidationService } from './services/validation.service';
import { DisputeService } from './services/dispute.service';
import { RemixService } from './services/remix.service';
import { JwtAuthGuard } from '../auth';
import { ExecutionContext } from '@nestjs/common';

describe('MonetizationController', () => {
    let controller: MonetizationController;
    let validationService: ValidationService;

    const mockValidationService = {
        submitValidation: jest.fn(),
        getValidationQueue: jest.fn(),
        getValidationHistory: jest.fn(),
    };

    const mockDisputeService = {
        flagClip: jest.fn(),
        getPendingFlags: jest.fn(),
        resolveFlag: jest.fn(),
    };

    const mockRemixService = {
        createRemix: jest.fn(),
        getRemixChain: jest.fn(),
        getRemixesOf: jest.fn(),
        getUserRemixStats: jest.fn(),
    };

    const mockDb = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MonetizationController],
            providers: [
                {
                    provide: ValidationService,
                    useValue: mockValidationService,
                },
                {
                    provide: DisputeService,
                    useValue: mockDisputeService,
                },
                {
                    provide: RemixService,
                    useValue: mockRemixService,
                },
                {
                    provide: 'DRIZZLE',
                    useValue: mockDb,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = { id: 'test-user-id', email: 'test@example.com' };
                    return true;
                },
            })
            .compile();

        controller = module.get<MonetizationController>(MonetizationController);
        validationService = module.get<ValidationService>(ValidationService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('submitValidation', () => {
        it('should call validationService.submitValidation', async () => {
            const dto = { voiceClipId: 'clip-1', isApproved: true, feedback: 'ok' };
            const user = { id: 'test-user-id', email: 'test@example.com' };

            mockValidationService.submitValidation.mockResolvedValue({ success: true });

            const result = await controller.submitValidation(dto, user);

            expect(result.success).toBe(true);
            expect(mockValidationService.submitValidation).toHaveBeenCalledWith(user.id, dto);
        });
    });

    describe('healthCheck', () => {
        it('should return ok', () => {
            const result = controller.healthCheck();
            expect(result.status).toBe('ok');
        });
    });
});
