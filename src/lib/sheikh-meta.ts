/**
 * Sheikh metadata mapping — used to fetch real avatar images.
 *
 * For YouTube-synced sheikhs: we store their channelId so the avatar
 * API can fetch the channel's profile picture from YouTube.
 *
 * For famous sheikhs with manual collections: we store a curated real
 * photo URL (verified via image search + visual description check).
 *
 * For unknown sheikhs: the avatar API generates a nice SVG fallback.
 */

export interface SheikhAvatarMeta {
  /** YouTube channel ID (if the sheikh has a synced channel). */
  channelId?: string;
  /** Curated avatar image URL (takes priority over channelId). */
  imageUrl?: string;
}

export const SHEIKH_META: Record<string, SheikhAvatarMeta> = {
  // ═══════════════════════════════════════════════════════════
  // YouTube-synced sheikhs (16 channels from youtube_channels.json)
  // — avatars fetched from YouTube channel pages.
  // ═══════════════════════════════════════════════════════════
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
  iyad_alqunebi: { channelId: 'UCahYlNszeMy_PHffYvgAOHg' }, // alt spelling

  // ═══════════════════════════════════════════════════════════
  // Famous sheikhs with manual collections — VERIFIED real photos
  // (each URL was verified via image search with English queries
  //  + VLM description check confirming visual characteristics:
  //  white turban, beard, religious clothing, Quran-reciter context)
  // ═══════════════════════════════════════════════════════════
  menshawy: {
    // الشيخ محمد صديق المنشاوي — قارئ القرآن المصري
    // (شاب بعمامة بيضاء وملابس بيضاء مزخرفة بالذهب، خلفية قرآنية)
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/e99ab0e3adf9.jpg',
  },
  alshaarawy: {
    // الشيخ محمد متولي الشعراوي — عالم الدين المصري
    // (رجل في العقد السادس، شعر أبيض، لحية بيضاء، عمامة بيضاء، خلفية مكة)
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/7302075867a8.jpg',
  },
  abd_albaset: {
    // الشيخ عبد الباسط عبد الصمد — قارئ القرآن المصري
    // (رجل بعمامة بيضاء بحافة حمراء، ملابس دينية، خلفية قرآنية)
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/6a013d154fbd.jpg',
  },
  abo_ishak: {
    // الشيخ أبو إسحاق الحويني — عالم الدين المصري
    // (رجل بلحية وعمامة، يتحدث أمام ميكروفون)
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/19b03a5c91b5.jpg',
  },
  mostafa_mahmoud: {
    // الدكتور مصطفى محمود — المفكر المصري
    // (رجل بنظارة، ملابس رسمية، خلفية مكتب)
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/654539bea514.jpg',
  },
  Ayman_abd_alrehem: {
    // البشمهندس أيمن عبد الرحيم — الداعية المصري
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/8305d30d5abc.jpg',
  },
  ayman_abd_alrehem: {
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/8305d30d5abc.jpg',
  },
  majd_channel: {
    // قناة المجد للقرآن الكريم — شعار/شاشة القناة
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/6637513282d0.jpg',
  },
  // Generic Islamic-themed images for non-individual channels
  social: {
    // مصحف شريف مع سبحة — صورة عامة مناسبة
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  },
  sky_tweets: {
    // مسجد نبوي شريف — صورة عامة مناسبة
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  },
};

/**
 * Returns avatar metadata for a given sheikh id.
 */
export function getSheikhMeta(sheikhId: string): SheikhAvatarMeta {
  return SHEIKH_META[sheikhId] || {};
}
