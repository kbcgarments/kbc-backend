import axios from 'axios';

interface IpApiResponse {
  city?: string;
  country_name?: string;
}

export async function getLocationFromIp(ip: string) {
  try {
    if (!ip || ip === '::1' || ip.startsWith('127.')) {
      return { city: 'Localhost', country: 'Local Network' };
    }

    const res = await axios.get<IpApiResponse>(`https://ipapi.co/${ip}/json/`);

    return {
      city: res.data.city || 'Unknown',
      country: res.data.country_name || 'Unknown',
    };
  } catch {
    return { city: 'Unknown', country: 'Unknown' };
  }
}
