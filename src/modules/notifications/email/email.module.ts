import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailDispatcher } from './email.dispatcher';

@Module({
  providers: [EmailService, EmailDispatcher],
  exports: [EmailService, EmailDispatcher],
})
export class EmailModule {}
