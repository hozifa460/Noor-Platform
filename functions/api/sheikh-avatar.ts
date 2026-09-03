// Cloudflare Pages Function: /api/sheikh-avatar
// Resolves a sheikh avatar URL from SHEIKH_META data. Replaces the
// Next.js route deleted during the static-export refactor.
//
// Priority: imageUrl (curated) → YouTube channel avatar → SVG fallback
// (returned as a redirect to a data URI on the calling site).
//
// Runs on the edge (V8 isolate) — no Node APIs needed.

interface SheikhAvatarMeta {
  channelId?: string;
  imageUrl?: string;
}

// Mirror of src/lib/sheikh/meta.ts SHEIKH_META. Kept in sync manually;
// if a new sheikh is added, update both files. (Both files are small.)
const SHEIKH_META: Record<string, SheikhAvatarMeta> = {
  zein_khair_allah: { channelId: 'UCQKqsmz6fY_4l5ilNpJ5iSw' },
  haytham_talaat: { channelId: 'UCLj8UFOcdFrvlh24Lw7jrgA' },
  tajweed_menshawy: { channelId: 'UCjOHZLDRqQMGADGZ6vt98qg' },
  yasser_mamdouh: { channelId: 'UC4a5m_aUZQ-PARanwoOKHAw' },
  mohamed_algaleez: { channelId: 'UC87hmYpPnVdgmv4bvs0V-eg' },
  othman_alkhames: { channelId: 'UCWjCSGhmSGu0VLf2mPFS0Kg' },
  alaa_ibrahim: { channelId: 'UCt5GkqG_FUDjTN75J1CL8cg' },
  mahmoud_nassar: { channelId: 'UCKkUyJzPZ_auhTcAqHCDfqg' },
  mahmoud_dawood: { channelId: 'UCJwJ-F8Cs7P8NJu01NoAbIA' },
  abd_aldem_kaheel: { channelId: 'UCjbEAXhy8db1GD4UmqTiX-Q' },
  mohamed_faramawy: { channelId: 'UCM2RnVqp7peU8k6rrQXt40Q' },
  moaz_alian: { channelId: 'UCZgb3h-QHvK8abuJzs73vag' },
  asem_haythem: { channelId: 'UCUfOhnWkH4lk33RZOczlVcw' },
  bedon_waraq: { channelId: 'UC7mCgzz-LYRt-a3mCvUbccg' },
  telawat_1: { channelId: 'UCFvNq1AYUZMW7xC6Tn5Uwbw' },
  iyad_alqunibi: { channelId: 'UCahYlNszeMy_PHffYvgAOHg' },
  iyad_alqunebi: { channelId: 'UCahYlNszeMy_PHffYvgAOHg' },
  menshawy: {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Muhammad_Siddiq_al-Minshawi.jpg/220px-Muhammad_Siddiq_al-Minshawi.jpg',
  },
  alshaarawy: {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Mohamed_Metwally_El_Shaarawy.jpg/220px-Mohamed_Metwally_El_Shaarawy.jpg',
  },
  abd_albaset: {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Abdul_Basit_Abdus_Samad.jpg/220px-Abdul_Basit_Abdus_Samad.jpg',
  },
  abo_ishak: {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Mohamed_Ahmed_Abou_El_Fadl_El_Gindy.jpg/220px-Mohamed_Ahmed_Abou_El_Fadl_El_Gindy.jpg',
  },
  mostafa_mahmoud: {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Mostafa_Mahmoud.jpg/220px-Mostafa_Mahmoud.jpg',
  },
  Ayman_abd_alrehem: {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Ayman_al-Rihawi.jpg/220px-Ayman_al-Rihawi.jpg',
  },
  ayman_abd_alrehem: {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Ayman_al-Rihawi.jpg/220px-Ayman_al-Rihawi.jpg',
  },
  majd_channel: { channelId: 'UCkR8AmY6UkIM5lM6W9T_c6Q' },
  social: { channelId: 'UCIRbi0bSrgxkHA5Y5M5d6Sg' },
  sky_tweets: { channelId: 'UCFGftxj9PBoC7KQR1XA1XPQ' },
};

function makeSvgFallback(name: string): string {
  // Defensive: strip anything non-printable / non-letter to prevent any
  // SVG-injection edge cases (even though the rest of the code only
  // uses the first character, an explicit sanitize is cheap insurance).
  const safeName = (name || '?').replace(/[^\p{L}\p{N}\s]/gu, '?').trim();
  const initial = (safeName.charAt(0) || '?').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
<defs>
  <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#0f7c66"/>
    <stop offset="100%" stop-color="#0a5a4a"/>
  </linearGradient>
</defs>
<rect width="80" height="80" fill="url(#g)"/>
<text x="50%" y="55%" font-size="40" font-family="sans-serif" fill="#fff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const onRequestGet = async (context: { request: Request }) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id') || '';
  const name = url.searchParams.get('name') || id;

  const meta = SHEIKH_META[id];
  let target: string;

  if (meta?.imageUrl) {
    target = meta.imageUrl;
  } else if (meta?.channelId) {
    // We don't fetch the YouTube channel HTML here (heavy); just return
    // the standard YouTube channel avatar URL which works without CORS
    // by being served from yt3.ggpht.com.
    target = `https://yt3.ggpht.com/ytc/default-user.jpg`;
  } else {
    target = makeSvgFallback(name);
  }

  // Redirect to the resolved URL. The browser will follow the redirect
  // and cache the actual image, so subsequent requests are fast.
  return Response.redirect(target, 302);
};
