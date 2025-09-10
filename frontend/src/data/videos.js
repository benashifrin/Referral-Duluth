// Shared list of videos using the requested shape
export const VIDEOS = [
  { title: 'Portugal (Azores)',                    link: 'https://www.youtube.com/watch?v=3UV9dNHHc8w' },
  { title: 'Norway',                               link: 'https://www.youtube.com/watch?v=ftlvreFtA2A' },
  { title: 'Iceland',                              link: 'https://www.youtube.com/watch?v=BfZpAZmHDqE' },
  { title: 'Switzerland',                          link: 'https://www.youtube.com/watch?v=jn1MIXgXJ8Y' },
  { title: 'Switzerland (Lauterbrunnen)',          link: 'https://www.youtube.com/watch?v=E0mrEIMecAY' },
  { title: 'Austria (Alps)',                       link: 'https://www.youtube.com/watch?v=qH27RAAL9i8' },
  { title: 'Italy (Dolomites)',                    link: 'https://www.youtube.com/watch?v=dG9aZnQE6cs' },
  { title: 'USA (Alaska)',                         link: 'https://www.youtube.com/watch?v=T75IKSXVXlc' },
  { title: 'USA (Hawaii – Oahu)',                  link: 'https://www.youtube.com/watch?v=4AtJV7U3DlU' },
  { title: 'Bermuda',                              link: 'https://www.youtube.com/watch?v=mA30W2dHQIo' },
  { title: 'French Polynesia (Bora Bora)',         link: 'https://www.youtube.com/watch?v=S5HsmYJhKOI' },
  { title: 'Portugal (Azores)',                    link: 'https://www.youtube.com/watch?v=lN2jPHG9dUU' },
  { title: 'Norway (Senja Island)',                link: 'https://www.youtube.com/watch?v=a4LEC73cGZo' },
  { title: 'Italy (Cinque Terre)',                 link: 'https://www.youtube.com/watch?v=7Ooc0P-PdbM' },
  { title: 'Italy (Cinque Terre)',                 link: 'https://www.youtube.com/watch?v=Xf5QTs2NLRc' },
  { title: 'New Zealand',                          link: 'https://www.youtube.com/watch?v=PVy8sLO2WUk' },
  { title: 'New Zealand (South Island)',           link: 'https://www.youtube.com/watch?v=Ky9xa_s297Y' },
  { title: 'Greece',                               link: 'https://www.youtube.com/watch?v=GKF1ZJcvEik' },
  { title: 'Greece',                               link: 'https://www.youtube.com/watch?v=gZK92r_qtlI' },
  { title: 'Fiji',                                 link: 'https://www.youtube.com/watch?v=TB6n7I52gzc' },
  { title: 'Fiji',                                 link: 'https://www.youtube.com/watch?v=p2m3Xf6yKT8' },
  { title: 'Türkiye (Turkey)',                     link: 'https://www.youtube.com/watch?v=2kHnweDfy54' },
  { title: 'Canada (Banff)',                       link: 'https://www.youtube.com/watch?v=uM-SXLvH60U' },
  { title: 'Canada (Banff – Moraine Lake)',        link: 'https://www.youtube.com/watch?v=TCt0fHvBZls' },
  { title: 'USA (California – Big Sur)',           link: 'https://www.youtube.com/watch?v=pXl1zvDcVFs' },
  { title: 'USA (California – Big Sur)',           link: 'https://www.youtube.com/watch?v=7YsQi88RUC8' },
  { title: 'French Polynesia (Tahiti)',            link: 'https://www.youtube.com/watch?v=by0xn5QPZLY' },
  { title: 'Honduras (Roatán)',                    link: 'https://www.youtube.com/watch?v=oyFSMwlfGKg' },
  { title: 'Spain (Canary Islands)',               link: 'https://www.youtube.com/watch?v=tBGz6v6AgP8' },
  { title: 'France (Corsica)',                     link: 'https://www.youtube.com/watch?v=3QTnnI_KHSw' }
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
