const RESTRICTED_AD_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
  'GB', 'CH',
]);

export async function onRequestGet({ request, env }) {
  const country = typeof request.cf?.country === 'string' ? request.cf.country.toUpperCase() : '';
  const countryResolved = /^[A-Z]{2}$/.test(country);
  const regulatedRegion = countryResolved && RESTRICTED_AD_REGIONS.has(country);
  const googleCmpActive = env?.GOOGLE_CMP_ACTIVE === 'true';
  const consentSurface = !countryResolved
    ? 'disabled'
    : regulatedRegion
      ? googleCmpActive ? 'google-cmp' : 'disabled'
      : 'site';
  const optionalScriptsAllowed = consentSurface === 'site';

  return new Response(JSON.stringify({
    country: countryResolved ? country : null,
    regulatedRegion,
    googleCmpActive,
    consentSurface,
    optionalScriptsAllowed,
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
