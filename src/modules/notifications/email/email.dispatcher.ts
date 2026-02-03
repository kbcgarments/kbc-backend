import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { EmailEvent } from './email.types';
import { EMAIL_TEMPLATE_MAP } from './email.templates';

@Injectable()
export class EmailDispatcher {
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

  async sendTemplateEmail(params: {
    to: string;
    event: EmailEvent;
    data?: Record<string, any>;
  }) {
    const templateId = EMAIL_TEMPLATE_MAP[params.event];

    if (!templateId) {
      throw new Error(`No Brevo template mapped for ${params.event}`);
    }

    await axios.post(
      this.brevoApiUrl,
      {
        to: [{ email: params.to }],
        templateId,
        params: params.data ?? {},
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY!,
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
