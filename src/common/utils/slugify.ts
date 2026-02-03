import slugify from 'slugify';

export function makeSlug(text: string) {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
}
