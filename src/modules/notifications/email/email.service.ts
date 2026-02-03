import { Injectable, InternalServerErrorException } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

type BrevoTemplatePayload = {
  to: string;
  templateId: number;
  params?: Record<string, any>;
};

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });
  }

  /* ================= SMTP (RAW HTML) ================= */

  async sendRaw(options: { to: string; subject: string; html: string }) {
    try {
      await this.transporter.sendMail({
        from: `"KBC Universe" <no-reply@kbcuniverse.org>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Email delivery failed',
      );
    }
  }

  /* ================= BREVO TEMPLATE ================= */

  async sendTemplate(payload: BrevoTemplatePayload) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY!,
        },
        body: JSON.stringify({
          to: [{ email: payload.to }],
          templateId: payload.templateId,
          params: payload.params ?? {},
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Brevo template send failed',
      );
    }
  }
}
