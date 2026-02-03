import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

/* ======================================================
   TYPES
====================================================== */

export type Locale = 'fr' | 'es' | 'zu';

/* ======================================================
   TRANSLATION SERVICE
====================================================== */

@Injectable()
export class TranslationService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(TranslationService.name);

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({ apiKey });
  }

  /* ======================================================
     SINGLE STRING TRANSLATION
  ====================================================== */

  async translate(text: string, targetLanguage: string): Promise<string> {
    if (!text || !text.trim()) return text;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `Translate the following text to ${targetLanguage}. Return only the translation.`,
          },
          { role: 'user', content: text },
        ],
      });

      return response.choices[0]?.message?.content?.trim() || text;
    } catch (error) {
      this.logger.error(`Translation failed (${targetLanguage})`, error);
      return text;
    }
  }

  /* ======================================================
     GENERIC OBJECT TRANSLATION (🔥 MAIN API 🔥)
  ====================================================== */

  async translateObject<T extends Record<string, string | null | undefined>>(
    input: T,
    sourceLocale: 'en' = 'en',
    targetLocales: Locale[] = ['fr', 'es', 'zu'],
  ): Promise<Record<string, string | null>> {
    const entries = Object.entries(input).filter(
      ([key, value]) =>
        key.endsWith(`_${sourceLocale}`) &&
        typeof value === 'string' &&
        value.trim().length > 0,
    );

    const result: Record<string, string | null> = {};

    await Promise.all(
      entries.flatMap(([key, value]) =>
        targetLocales.map(async (locale) => {
          const baseKey = key.replace(`_${sourceLocale}`, '');
          const translated = await this.translate(
            value as string,
            this.mapLocale(locale),
          );
          result[`${baseKey}_${locale}`] = translated;
        }),
      ),
    );

    return result;
  }

  /* ======================================================
     LOCALE → LANGUAGE MAP
  ====================================================== */

  private mapLocale(locale: Locale): string {
    switch (locale) {
      case 'fr':
        return 'French';
      case 'es':
        return 'Spanish';
      case 'zu':
        return 'Zulu';
    }
  }
}
