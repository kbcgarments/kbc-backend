export function parseDeviceInfo(userAgent: string = '') {
  const ua = userAgent.toLowerCase();

  let device = 'Unknown Device';
  let browser = 'Unknown Browser';

  if (ua.includes('iphone')) device = 'iPhone';
  else if (ua.includes('ipad')) device = 'iPad';
  else if (ua.includes('android')) device = 'Android Phone';
  else if (ua.includes('mac os')) device = 'Mac';
  else if (ua.includes('windows')) device = 'Windows PC';

  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edge')) browser = 'Edge';

  return { device, browser };
}
