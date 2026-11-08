import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('Health Check Endpoint', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should return health status ok for kitcheniano-client-be', () => {
    expect(appController.getHealth()).toEqual({
      status: 'ok',
      service: 'kitcheniano-client-be',
      port: 4001,
    });
  });
});
