const RESTRICTED_AD_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
  'GB', 'CH',
]);

export async function onRequestGet({ request }) {
  const country = typeof request.cf?.country === 'string' ? request.cf.country.toUpperCase() : '';
  const countryResolved = /^[A-Z]{2}$/.test(country);
  const optionalScriptsAllowed = countryResolved && !RESTRICTED_AD_REGIONS.has(country);

  return new Response(JSON.stringify({
    country: countryResolved ? country : null,
    optionalScriptsAllowed,
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
