'use client';

import React from 'react';
import { type NarratorProfile } from '@/lib/hadith/narrator-engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Crown,
  Sparkles,
  BookOpen,
  MapPin,
  Calendar,
  Award,
  Scroll,
  X,
  Quote,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NarratorBioModalProps {
  profile: NarratorProfile | null;
  onClose: () => void;
}

export function NarratorBioModal({ profile, onClose }: NarratorBioModalProps) {
  if (!profile) return null;

  const isProphet = profile.id === 'prophet_muhammad';
  const isSahabi = profile.gradeType === 'sahabi' && !isProphet;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] bg-card border border-border/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title & Aura */}
        <div
          className={cn(
            'p-5 sm:p-6 border-b border-border/80 shrink-0 relative overflow-hidden',
            isProphet
              ? 'bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent'
              : isSahabi
              ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent'
              : 'bg-gradient-to-br from-primary/15 via-primary/5 to-transparent'
          )}
        >
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'size-13 sm:size-14 rounded-2xl grid place-items-center shrink-0 shadow-md font-bold',
                  isProphet
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-4 ring-amber-500/30'
                    : isSahabi
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-4 ring-emerald-500/30'
                    : 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                )}
              >
                {isProphet ? (
                  <Crown className="size-7 animate-pulse" />
                ) : isSahabi ? (
                  <Sparkles className="size-6" />
                ) : (
                  <User className="size-6" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-lg sm:text-xl text-foreground">
                    {profile.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-lg border',
                      isProphet
                        ? 'bg-amber-500/25 text-amber-900 dark:text-amber-200 border-amber-500/40'
                        : isSahabi
                        ? 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border-emerald-500/40'
                        : 'bg-primary/20 text-primary border-primary/30'
                    )}
                  >
                    {profile.tabaqah}
                  </Badge>
                </div>

                {profile.kunya && (
                  <p className="text-xs text-muted-foreground font-medium">
                    الكُنية: <strong className="text-foreground">{profile.kunya}</strong>
                  </p>
                )}
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="size-8 rounded-xl hover:bg-destructive/10 hover:text-destructive"
              title="إغلاق"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Body Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Jarh & Ta'dil Grade Card */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Award className="size-4" />
              <span>رتبة الراوي وحكم الجرح والتعديل:</span>
            </div>
            <p className="text-sm font-extrabold text-foreground leading-relaxed">
              {profile.grade}
            </p>
          </div>

          {/* Full Genealogical Lineage */}
          {profile.fullName && (
            <div className="space-y-1 text-xs sm:text-sm">
              <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                <Scroll className="size-3.5 text-primary" />
                الاسم والنسب الكامل:
              </span>
              <p className="text-foreground font-medium pr-5 leading-relaxed">
                {profile.fullName}
              </p>
            </div>
          )}

          {/* Meta: Death & Residence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {profile.death && (
              <div className="p-3 rounded-xl bg-card border border-border/70 flex items-center gap-2.5">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block">سنة ومكان الوفاة:</span>
                  <span className="font-bold text-foreground">{profile.death}</span>
                </div>
              </div>
            )}

            {profile.residence && (
              <div className="p-3 rounded-xl bg-card border border-border/70 flex items-center gap-2.5">
                <MapPin className="size-4 text-muted-foreground shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block">بلد الإقامة والمقام:</span>
                  <span className="font-bold text-foreground">{profile.residence}</span>
                </div>
              </div>
            )}
          </div>

          {/* Brief Biography */}
          <div className="space-y-1.5 text-xs sm:text-sm">
            <span className="font-bold text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-primary" />
              ترجمة موجزة وسيرة الراوي:
            </span>
            <p className="text-foreground/90 leading-relaxed font-normal bg-card/60 p-3.5 rounded-2xl border border-border/70 text-justify">
              {profile.briefBio}
            </p>
          </div>

          {/* Scholarly Opinions in Jarh & Ta'dil */}
          {profile.scholarlyOpinions && profile.scholarlyOpinions.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold text-xs text-muted-foreground flex items-center gap-1.5">
                <Quote className="size-3.5 text-primary" />
                أقوال أئمة الحديث والجرح والتعديل فيه:
              </span>

              <div className="space-y-2">
                {profile.scholarlyOpinions.map((op, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-muted/20 border border-border/60 text-xs space-y-1"
                  >
                    <strong className="text-primary font-bold block">{op.scholar}:</strong>
                    <p className="text-foreground/90 leading-relaxed font-medium">« {op.opinion} »</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teachers & Students */}
          {(profile.teachers || profile.students) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              {profile.teachers && profile.teachers.length > 0 && (
                <div className="p-3 rounded-2xl bg-card border border-border/70 space-y-1.5">
                  <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                    <GraduationCap className="size-3.5 text-primary" />
                    أبرز شيوخه:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {profile.teachers.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-medium bg-muted/30">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.students && profile.students.length > 0 && (
                <div className="p-3 rounded-2xl bg-card border border-border/70 space-y-1.5">
                  <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                    <User className="size-3.5 text-primary" />
                    أبرز تلاميذه والآخذين عنه:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {profile.students.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-medium bg-muted/30">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-border flex items-center justify-end bg-muted/20 shrink-0">
          <Button size="sm" variant="default" onClick={onClose} className="rounded-xl px-5 h-8 font-bold text-xs">
            إغلاق الترجمة
          </Button>
        </div>
      </div>
    </div>
  );
}
