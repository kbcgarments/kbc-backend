import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const port = Number(process.env.PORT) || 4000;
  app.use(bodyParser.json());
  app.use(cookieParser());

  // Swagger config
  const config = new DocumentBuilder()
    .setTitle('KBC E-Commerce API')
    .setDescription('API documentation for KBC e-commerce backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (
        !origin ||
        origin.includes('localhost') ||
        origin.includes('kbcuniverse.org')
      ) {
        callback(null, true);
      } else {
        callback(new Error('CORS blocked'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Cookie',
      'deviceId',
      'x-device-id',
    ],
    exposedHeaders: ['Set-Cookie', 'x-device-id'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup Swagger
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);

  // Connect Prisma
  const prisma = app.get(PrismaService);
  await prisma.$connect();

  // Start server
  await app.listen(port);
}

void bootstrap();
