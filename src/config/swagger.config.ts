import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { appendAuthPaths } from './auth-paths.openapi';

export const setupSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('EasyPay API')
    .setDescription('Android wallet API for P2P transfers')
    .setVersion('0.0.1')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'Token',
      description: 'Enter bearer token from sign-in response',
      in: 'header',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  appendAuthPaths(document);

  SwaggerModule.setup('api/docs', app, document);
};
