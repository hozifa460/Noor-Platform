'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowRight, Download, Loader2, Music, Video, ExternalLink, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface VideoInfo {
  title: string;
  author: string;
  thumbnail: string;
  videoId: string;
}

export default function DownloadPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeService, setActiveService] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );
        if (!res.ok) throw new Error('فشل جلب معلومات الفيديو');
        const data = await res.json();
        setInfo({
          title: data.title,
          author: data.author_name,
          thumbnail: data.thumbnail_url,
          videoId,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطأ غير معروف');
      } finally {
        setLoading(false);
      }
    }
    if (videoId) fetchInfo();
  }, [videoId]);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const services = [
    {
      id: 'cobalt',
      label: 'Cobalt Tools',
      url: `https://cobalt.tools/?u=${encodeURIComponent(youtubeUrl)}`,
      quality: 'جميع الجودات',
      type: 'video',
      icon: Download,
      color: 'from-pink-500 to-rose-500',
      description: 'الأفضل — يدعم فيديو وصوت بجودات متعددة',
    },
    {
      id: 'y2mate',
      label: 'Y2Mate',
      url: `https://www.y2mate.com/youtube/${videoId}`,
      quality: 'MP4 حتى 1080p + MP3',
      type: 'video',
      icon: Video,
      color: 'from-red-500 to-orange-500',
      description: 'سريع — يدعم فيديو وصوت',
    },
    {
      id: 'savefrom',
      label: 'SaveFrom',
      url: `https://en1.savefrom.net/234/download.php?u=${encodeURIComponent(youtubeUrl)}`,
      quality: 'MP4 + MP3',
      type: 'video',
      icon: Download,
      color: 'from-green-500 to-emerald-500',
      description: 'موثوق — يدعم فيديو وصوت',
    },
    {
      id: '9xbuddy',
      label: '9xBuddy',
      url: `https://9xbuddy.com/process?url=${encodeURIComponent(youtubeUrl)}`,
      quality: 'متعدد',
      type: 'video',
      icon: Download,
      color: 'from-blue-500 to-cyan-500',
      description: 'يدعم مواقع متعددة',
    },
    {
      id: 'dirpy',
      label: 'Dirpy',
      url: `https://dirpy.com/youtube/${videoId}`,
      quality: 'MP3 + MP4',
      type: 'audio',
      icon: Music,
      color: 'from-purple-500 to-violet-500',
      description: 'ممتاز للصوت — مع توقيتات',
    },
    {
      id: 'ytmp3',
      label: 'YTMP3',
      url: `https://ytmp3.cc/youtube-to-mp3/?url=${encodeURIComponent(youtubeUrl)}`,
      quality: 'MP3 فقط',
      type: 'audio',
      icon: Music,
      color: 'from-amber-500 to-yellow-500',
      description: 'للصوت فقط — سريع',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="size-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowRight className="size-4 ml-2" />
              العودة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass sticky top-0 z-40 border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="رجوع">
            <ArrowRight className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate">تنزيل الفيديو</h1>
            <p className="text-xs text-muted-foreground truncate">{info?.author}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Video info */}
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 p-4">
            <div className="w-full sm:w-48 aspect-video rounded-lg overflow-hidden shrink-0 bg-muted">
              <img
                src={info?.thumbnail}
                alt={info?.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base sm:text-lg mb-2 line-clamp-3">{info?.title}</h2>
              <Badge variant="secondary" className="gap-1">
                <Video className="size-3" />
                {info?.author}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Info banner */}
        <div className="mb-6 rounded-xl bg-primary/10 border border-primary/20 p-4 text-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">اختر خدمة التنزيل والجودة</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                يوتيوب يحظر التنزيل المباشر من الخوادم. اختر إحدى الخدمات التالية —
                سيتم فتح صفحة التنزيل في نافذة منبثقة. اختر الجودة والصيغة (MP4 أو MP3)
                ثم اضغط تنزيل.
              </p>
            </div>
          </div>
        </div>

        {/* Service selection */}
        <div className="mb-6">
          <h3 className="font-bold text-sm mb-3">اختر الخدمة:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {services.map((svc) => {
              const Icon = svc.icon;
              const isActive = activeService === svc.id;
              return (
                <button
                  key={svc.id}
                  onClick={() => setActiveService(svc.id)}
                  className={`text-right rounded-xl border-2 p-3 transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className={`size-10 rounded-lg bg-gradient-to-br ${svc.color} grid place-items-center mb-2`}>
                    <Icon className="size-5 text-white" />
                  </div>
                  <p className="font-bold text-xs mb-1">{svc.label}</p>
                  <p className="text-[10px] text-muted-foreground">{svc.quality}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active service iframe or open button */}
        {activeService && (() => {
          const svc = services.find((s) => s.id === activeService)!;
          return (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <svc.icon className="size-4 text-primary" />
                    {svc.label}
                  </CardTitle>
                  <a
                    href={svc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    فتح في تبويب جديد
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">{svc.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <a
                    href={svc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-gradient-to-br text-white font-bold text-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
                  >
                    <span className={`size-8 rounded-lg bg-gradient-to-br ${svc.color} grid place-items-center`}>
                      <svc.icon className="size-4 text-white" />
                    </span>
                    فتح صفحة التنزيل — {svc.quality}
                  </a>
                  <p className="text-[11px] text-muted-foreground text-center">
                    سيتم فتح صفحة التنزيل في نافذة جديدة. الصق رابط الفيديو (موجود بالأسفل) واختر الجودة.
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Direct URL */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">رابط الفيديو المباشر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted rounded-lg p-3 overflow-x-auto" dir="ltr">
                {youtubeUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(youtubeUrl);
                  toast.success('تم نسخ الرابط');
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audio download note */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Music className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">لتنزيل الصوت فقط (MP3)</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  استخدم <strong>YTMP3</strong> أو <strong>Dirpy</strong> أو <strong>SaveFrom</strong>.
                  هذه الخدمات توفر تنزيلاً مباشراً للصوت بجودة عالية بدون فيديو.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
