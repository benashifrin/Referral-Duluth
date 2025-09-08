// Shared list of videos using the requested shape
export const VIDEOS = [
  { title: 'Turkey',      link: 'https://www.youtube.com/watch?v=5MoVP4uH7go' },
  { title: 'Japan',       link: 'https://www.youtube.com/watch?v=cyZLgroH8xw' },
  { title: 'India',       link: 'https://www.youtube.com/watch?v=vJTCP7fqgog' },
  { title: 'Thailand',    link: 'https://www.youtube.com/watch?v=eS68zcYPNIU' },
  { title: 'Morocco',     link: 'https://www.youtube.com/watch?v=lAwEPNhTcEI' },
  { title: 'Egypt',       link: 'https://www.youtube.com/watch?v=uGjrx7mfRWs' },
  { title: 'Norway',      link: 'https://www.youtube.com/watch?v=ULrIMokyFMo' },
  { title: 'New Zealand', link: 'https://www.youtube.com/watch?v=Ky9xa_s297Y' },
  { title: 'Peru',        link: 'https://www.youtube.com/watch?v=VVjmFIhJ7Ks' },
  { title: 'USA',         link: 'https://www.youtube.com/watch?v=Aw0pZ0tS8Ok' }
];

export function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace('/', '');
    }
    return u.searchParams.get('v') || '';
  } catch (e) {
    return '';
  }
}

