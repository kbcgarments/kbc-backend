export function generateAddressHash(input: {
  shippingStreet: string;
  shippingCity: string;
  shippingState?: string | null;
  shippingPostal?: string | null;
  shippingCountry: string;
}) {
  return [
    input.shippingStreet,
    input.shippingCity,
    input.shippingState ?? '',
    input.shippingPostal ?? '',
    input.shippingCountry,
  ]
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9|]/g, '')
    .replace(/\s+/g, '');
}
