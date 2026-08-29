import DownloadClient from './DownloadClient';

// For static export, we render a single placeholder page; the client
// component reads the [videoId] segment from useParams and fetches
// info at runtime. Any YouTube ID works because Cloudflare's static
// serving + the SPA's client router handle unknown paths.
export function generateStaticParams() {
  return [{ videoId: 'index' }];
}

export default function DownloadPage() {
  return <DownloadClient />;
}
