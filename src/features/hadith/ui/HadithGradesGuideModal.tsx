'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  X,
  ShieldCheck,
  Award,
  Sparkles,
  AlertTriangle,
  Flame,
  Info,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HadithGradesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GRADES_DATA = [
  {
    id: 'muttafaqun',
    title: 'المتفق عليه',
    badgeText: 'أعلى درجات الصحة 🌟',
    colorClass: 'emerald',
    icon: Award,
    borderClass: 'border-emerald-500/50 dark:border-emerald-500/30',
    bgClass: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    textBadgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
    definition: 'ما اتّفق على إخراجه الشيخان؛ الإمام البخاري والإمام مسلم في صحيحيهما عن نفس الصحابي.',
    scholarlyStatus: 'أجمع المسلمون سلفاً وخلفاً على تلقّي الصحيحين بالقبول والتصديق القاطع، وهو أصح ما رُوي عن النبي ﷺ بعد كتاب الله عز وجل.',
    ruling: 'واجب القبول والعمل به بالاتفاق قطعاً، ويفيد العلم اليقيني النظري عند جمهور الأئمة.',
    famousQuote: 'قال الإمام النووي رحمه الله: «أجمع العلماء على أن أصح الكتب بعد القرآن العزيز صحيحا البخاري ومسلم، وتلقتهما الأمة بالقبول».',
    example: 'حديث: «إنما الأعمال بالنيات»، وحديث: «بني الإسلام على خمس».',
  },
  {
    id: 'sahih',
    title: 'الصحيح (لذاته ولغيره)',
    badgeText: 'مقبول ثابت واحتجاج تام 🛡️',
    colorClass: 'green',
    icon: ShieldCheck,
    borderClass: 'border-green-500/50 dark:border-green-500/30',
    bgClass: 'bg-green-500/5 dark:bg-green-500/10',
    textBadgeClass: 'bg-green-500/15 text-green-800 dark:text-green-200 border-green-500/30',
    definition: 'ما اتّصل إسناده بنقل العدل تام الضبط عن مثله إلى منتهاه، من غير شذوذ ولا علة قادحة.',
    scholarlyStatus: 'شروط خمسة صارمة: (1) اتصال السند، (2) عدالة الرواة بالتقوى والمروءة، (3) تمام الحفظ والإتقان، (4) السلامة من مخالفة الثقات (الشذوذ)، (5) السلامة من العيوب الخفية (العلة).',
    ruling: 'الصحيح لذاته هو ما توفرت فيه الشروط بأعلى رتبها. والصحيح لغيره هو حديث حسن ارتقى وقوي بتعدد الطرق والروايات الأخرى المعتبرة. وحكمهما واحد: واجب العمل في العقائد والأحكام والفضائل.',
    famousQuote: 'قال الحافظ ابن الصلاح: «الحديث الصحيح هو الحديث المسند الذي يتصل إسناده بنقل العدل الضابط عن العدل الضابط إلى منتهاه ولا يكون شاذاً ولا معللاً».',
    example: 'أحاديث البخاري ومسلم المنفردة، والأحاديث المصححة في السنن الأربعة ومسند الإمام أحمد.',
  },
  {
    id: 'hasan',
    title: 'الحسن (لذاته ولغيره)',
    badgeText: 'حجة في الأحكام والسنن 💎',
    colorClass: 'sky',
    icon: Sparkles,
    borderClass: 'border-sky-500/50 dark:border-sky-500/30',
    bgClass: 'bg-sky-500/5 dark:bg-sky-500/10',
    textBadgeClass: 'bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30',
    definition: 'ما اتصل سنده بنقل عدل خفّ ضبطه قليلاً عن رتبة الصحيح، وسلم من الشذوذ والعلة القادحة.',
    scholarlyStatus: 'راويه عدل مستقيم، لكن حفظه وإتقانه أقل بقليل من راوي الصحيح. والحسن لغيره هو حديث ضعيف خفيف الضعف جاء من طرق أخرى عضدته فقوته حتى صار حسناً.',
    ruling: 'حجة مقبولة يحتج بها الفقهاء والمحدثون في سائر الأحكام الفقهية (الحلال والحرام) والفضائل والمعاملات.',
    famousQuote: 'قال الحافظ ابن حجر: «الحسن كالصحيح في الاحتجاج به، وإن كان دونه في القوة والضبط».',
    example: 'أكثر أحاديث جامع الترمذي وسنن أبي داود التي حسّنها الأئمة.',
  },
  {
    id: 'daif',
    title: 'الضعيف',
    badgeText: 'قصر عن رتبة القبول ⚖️',
    colorClass: 'amber',
    icon: AlertTriangle,
    borderClass: 'border-amber-500/50 dark:border-amber-500/30',
    bgClass: 'bg-amber-500/5 dark:bg-amber-500/10',
    textBadgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30',
    definition: 'ما لم تجتمع فيه صفات الحديث المقبول (الصحيح والحسن)، إما لسقط في سنده أو لضعف في ضبط راويه أو عدالته.',
    scholarlyStatus: 'درجات الضعف متفاوتة؛ فمنه الضعيف خفيف الضعف، ومنه شديد الضعف (كالمنكر والمتروك).',
    ruling: 'لا تثبت به عقائد ولا أحكام حلال وحرام. وأجاز جماهير العلماء روايته والاستئناس به في فضائل الأعمال والترغيب والترهيب بشروط ثلاثة معتمدة: (1) ألا يشتد ضعفه، (2) أن يندرج تحت أصل عام شرعي، (3) ألا يُعتقد ثبوته عند العمل به.',
    famousQuote: 'قال الحافظ ابن حجر: «شروط العمل بالضعيف: أولاً: أن يكون الضعف غير شديد، ثانياً: أن يندرج تحت أصل عام، ثالثاً: ألا يُعتقد عند العمل به ثبوته».',
    example: 'أحاديث تحديد أدعية مخصوصة بأيام معينة لم تثبت بأسانيد صحيحة.',
  },
  {
    id: 'mawdu',
    title: 'الموضوع (المكذوب)',
    badgeText: 'مكذوب باطل محرم النسبة ⚠️',
    colorClass: 'rose',
    icon: Flame,
    borderClass: 'border-rose-500/50 dark:border-rose-500/30',
    bgClass: 'bg-rose-500/5 dark:bg-rose-500/10',
    textBadgeClass: 'bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30',
    definition: 'الحديث المختلق المصنوع، المفترى والمنسوب كذباً وزوراً إلى رسول الله ﷺ.',
    scholarlyStatus: 'هو شر الأحاديث وأسوأها، وليس من حديث رسول الله ﷺ في الحقيقة.',
    ruling: 'محرم باتفاق الأمة الإسلامية؛ لا يجوز العمل به، ولا تحل روايته أو نقله أو نشره في وسائل التواصل أو غيرها إلا مقروناً بالبيان الصريح أنه كذب موضوع للتحذير منه.',
    famousQuote: 'قال النبي ﷺ: «مَنْ حَدَّثَ عَنِّي بِحَدِيثٍ يُرَى أَنَّهُ كَذِبٌ فَهُوَ أَحَدُ الْكَاذِبِينَ» (رواه مسلم).',
    example: '«صوموا تصحوا» (واهن)، وأحاديث فضل شهور أو أطعمة معينة مختلقة كأحاديث فضل الباذنجان أو العدس.',
  },
];

export function HadithGradesGuideModal({ isOpen, onClose }: HadithGradesGuideModalProps) {
  const [activeTab, setActiveTab] = useState('muttafaqun');

  if (!isOpen) return null;

  const currentGrade = GRADES_DATA.find((g) => g.id === activeTab) || GRADES_DATA[0];
  const IconComp = currentGrade.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-background rounded-3xl border border-border shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/80 bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-foreground flex items-center gap-2">
                <span>دليل درجات ورتب الحديث عند أهل العلم</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                معايير القبول والرد وكيفية التمييز بين مراتب السنة النبوية الشريفة
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full size-9 hover:bg-muted"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-3 border-b border-border/60 bg-muted/20 overflow-x-auto scrollbar-none">
          {GRADES_DATA.map((item) => {
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                )}
              >
                <span>{item.title.split(' ')[0]}</span>
                {item.id === 'muttafaqun' && <span>🌟</span>}
                {item.id === 'mawdu' && <span>⚠️</span>}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Active Card Summary Box */}
          <div
            className={cn(
              'p-4 sm:p-5 rounded-2xl border transition-all space-y-4',
              currentGrade.borderClass,
              currentGrade.bgClass
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-background/80 shadow-xs">
                  <IconComp className="size-6 text-foreground" />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg sm:text-xl text-foreground">
                    {currentGrade.title}
                  </h4>
                  <Badge variant="outline" className={cn('text-xs mt-0.5', currentGrade.textBadgeClass)}>
                    {currentGrade.badgeText}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Definition */}
            <div className="space-y-1.5 text-sm leading-relaxed">
              <h5 className="font-bold text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="size-3.5 text-primary" />
                <span>التعريف والماهية:</span>
              </h5>
              <p className="text-foreground font-medium pr-1">{currentGrade.definition}</p>
            </div>

            {/* Conditions / Details */}
            <div className="space-y-1.5 text-sm leading-relaxed">
              <h5 className="font-bold text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>الضوابط والشروط العلمية:</span>
              </h5>
              <p className="text-foreground font-medium pr-1">{currentGrade.scholarlyStatus}</p>
            </div>

            {/* Ruling */}
            <div className="space-y-1.5 text-sm leading-relaxed">
              <h5 className="font-bold text-xs text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="size-3.5 text-primary" />
                <span>حكم الاحتجاج والعمل به:</span>
              </h5>
              <p className="text-foreground font-medium pr-1">{currentGrade.ruling}</p>
            </div>

            {/* Famous Quote */}
            <div className="p-3.5 rounded-xl bg-background/90 border border-border/80 text-xs sm:text-sm text-foreground/90 italic pr-4 border-r-4 border-r-primary">
              {currentGrade.famousQuote}
            </div>

            {/* Example */}
            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
              <span className="font-bold text-foreground">أمثلة شائعة:</span>
              <span>{currentGrade.example}</span>
            </div>
          </div>

          {/* Practical Advice Banner */}
          <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
            <h5 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <span>وصية أئمة الحديث للمسلم المعاصر:</span>
            </h5>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              عليك بالحرص الشديد على التثبت مما يُنقل عن رسول الله ﷺ، وعدم نشر أي حديث في مجموعات التواصل حتى تتأكد من صحته وتخريجه من مصادر السنة المعتمدة. قال النبي ﷺ: «كَفَى بِالْمَرْءِ كَذِبًا أَنْ يُحَدِّثَ بِكُلِّ مَا سَمِعَ» (رواه مسلم).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/80 bg-card/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            منصة النور — قسم الحديث الشريف
          </span>
          <Button onClick={onClose} size="sm" className="rounded-xl px-5 font-bold text-xs">
            إغلاق الدليل
          </Button>
        </div>
      </div>
    </div>
  );
}
