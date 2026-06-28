'use client';

import { useState } from 'react';
import { Github, Gitlab, Plus, Trash2, RefreshCw, Moon, Sun, Save, Database, Clock, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/stores/settings.store';
import { useLibraryStore } from '@/stores/library.store';
import { useLibrarySync } from '@/hooks/use-library';
import { loadRepositories, saveRepositories } from '@/lib/repositories';
import type { RepositorySource } from '@/lib/types';
import { toast } from 'sonner';

export function SettingsView() {
  const settings = useSettingsStore();
  const repoStatus = useLibraryStore((s) => s.repoStatus);
  const lastSync = useLibraryStore((s) => s.lastSync);
  const { sync } = useLibrarySync();

  const [repos, setRepos] = useState<RepositorySource[]>(() => loadRepositories());

  const updateRepo = (id: string, patch: Partial<RepositorySource>) => {
    setRepos((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRepo = () => {
    const newId = `repo-${Date.now()}`;
    setRepos((rs) => [
      ...rs,
      { id: newId, provider: 'github', owner: '', repo: '', branch: 'main', path: '/', enabled: true },
    ]);
  };

  const removeRepo = (id: string) => {
    setRepos((rs) => rs.filter((r) => r.id !== id));
  };

  const saveRepos = () => {
    saveRepositories(repos);
    toast.success('تم حفظ المستودعات');
    sync();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">إدارة المستودعات والمظهر والمزامنة</p>
      </div>

      {/* Repositories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            المستودعات
          </CardTitle>
          <CardDescription>
            أضف عددًا غير محدود من مستودعات GitHub و GitLab. تتم مزامنة كل ملفات index.json تلقائيًا ودمجها.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {repos.map((repo) => {
            const status = repoStatus.find((s) => s.repoId === repo.id);
            return (
              <div key={repo.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {repo.provider === 'github' ? (
                      <Github className="size-4" />
                    ) : (
                      <Gitlab className="size-4" />
                    )}
                    <span className="text-xs text-muted-foreground">{repo.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {status && (
                      <Badge variant={status.ok ? 'default' : 'destructive'} className="text-[10px]">
                        {status.ok ? `${status.fileCount} ملف` : 'فشل'}
                      </Badge>
                    )}
                    <Switch
                      checked={repo.enabled !== false}
                      onCheckedChange={(v) => updateRepo(repo.id, { enabled: v })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeRepo(repo.id)} aria-label="حذف">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">المزود</Label>
                    <Select
                      value={repo.provider}
                      onValueChange={(v) => updateRepo(repo.id, { provider: v as 'github' | 'gitlab' })}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="github">GitHub</SelectItem>
                        <SelectItem value="gitlab">GitLab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">الفرع</Label>
                    <Input
                      value={repo.branch || 'main'}
                      onChange={(e) => updateRepo(repo.id, { branch: e.target.value })}
                      className="h-9"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">المالك (owner)</Label>
                    <Input
                      value={repo.owner}
                      onChange={(e) => updateRepo(repo.id, { owner: e.target.value })}
                      placeholder="e.g. islamic-streaming"
                      className="h-9"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">المستودع (repo)</Label>
                    <Input
                      value={repo.repo}
                      onChange={(e) => updateRepo(repo.id, { repo: e.target.value })}
                      placeholder="e.g. content-main"
                      className="h-9"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">المسار (path)</Label>
                  <Input
                    value={repo.path || '/'}
                    onChange={(e) => updateRepo(repo.id, { path: e.target.value })}
                    placeholder="/"
                    className="h-9"
                    dir="ltr"
                  />
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={addRepo} className="gap-2">
              <Plus className="size-4" />
              إضافة مستودع
            </Button>
            <Button size="sm" onClick={saveRepos} className="gap-2">
              <Save className="size-4" />
              حفظ ومزامنة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="size-5 text-primary" />
            المزامنة
          </CardTitle>
          <CardDescription>
            آخر مزامنة: {lastSync ? new Date(lastSync).toLocaleString('ar') : 'لم تتم بعد'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <Label className="cursor-pointer">مزامنة تلقائية</Label>
            </div>
            <Switch checked={settings.autoSync} onCheckedChange={settings.setAutoSync} />
          </div>
          <Separator />
          <div>
            <Label className="text-xs">فترة المزامنة (دقائق)</Label>
            <Select
              value={String(settings.syncIntervalMin)}
              onValueChange={(v) => settings.setSyncIntervalMin(Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">كل 5 دقائق</SelectItem>
                <SelectItem value="10">كل 10 دقائق</SelectItem>
                <SelectItem value="30">كل 30 دقيقة</SelectItem>
                <SelectItem value="60">كل ساعة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="size-4 text-muted-foreground" />
              <Label className="cursor-pointer">جلب مسبق في الخلفية</Label>
            </div>
            <Switch checked={settings.prefetch} onCheckedChange={settings.setPrefetch} />
          </div>
          <Button onClick={() => sync()} className="w-full gap-2">
            <RefreshCw className="size-4" />
            مزامنة الآن
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings.theme === 'dark' ? <Moon className="size-5 text-primary" /> : <Sun className="size-5 text-primary" />}
            المظهر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">السمة</Label>
            <Select value={settings.theme} onValueChange={(v) => settings.setTheme(v as 'light' | 'dark')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">داكنة</SelectItem>
                <SelectItem value="light">فاتحة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div>
            <Label className="text-xs">اللغة</Label>
            <Select value={settings.language} onValueChange={(v) => settings.setLanguage(v as 'ar' | 'en')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
