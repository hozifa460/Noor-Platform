# -*- coding: utf-8 -*-
import os
import sys
import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def prepare_arabic(text):
    if not text:
        return ""
    reshaped_text = arabic_reshaper.reshape(text)
    bidi_text = get_display(reshaped_text)
    return bidi_text

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("ArabicBold", 9)
        self.setFillColor(colors.HexColor("#4A5568"))
        
        # Header (pages after first)
        if self._pageNumber > 1:
            header_text = prepare_arabic("منصة النور — التقرير الفني الشامل والتدقيق الأمني والمعماري")
            self.drawRightString(A4[0] - 40, A4[1] - 30, header_text)
            self.setStrokeColor(colors.HexColor("#CBD5E0"))
            self.setLineWidth(0.5)
            self.line(40, A4[1] - 35, A4[0] - 40, A4[1] - 35)

        # Footer
        footer_text = prepare_arabic(f"صفحة {self._pageNumber} من {page_count}")
        brand_text = prepare_arabic("منصة النور الإسلامية © 2026")
        self.drawString(40, 25, brand_text)
        self.drawRightString(A4[0] - 40, 25, footer_text)
        self.setStrokeColor(colors.HexColor("#CBD5E0"))
        self.setLineWidth(0.5)
        self.line(40, 38, A4[0] - 40, 38)
        self.restoreState()

def create_audit_pdf(output_path="Noor_Platform_Audit_Report.pdf"):
    # Register Arabic Fonts
    font_paths = [
        ("Arabic", "C:/Windows/Fonts/tahoma.ttf"),
        ("ArabicBold", "C:/Windows/Fonts/tahomabd.ttf"),
    ]
    if not os.path.exists(font_paths[1][1]):
        font_paths[1] = ("ArabicBold", "C:/Windows/Fonts/arialbd.ttf")
    if not os.path.exists(font_paths[0][1]):
        font_paths[0] = ("Arabic", "C:/Windows/Fonts/arial.ttf")

    for name, path in font_paths:
        pdfmetrics.registerFont(TTFont(name, path))

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()
    
    # Custom Arabic Styles
    title_style = ParagraphStyle(
        'ArabicTitle',
        parent=styles['Normal'],
        fontName='ArabicBold',
        fontSize=22,
        leading=28,
        alignment=1, # Center
        textColor=colors.HexColor("#0D5C46"), # Emerald dark
        spaceAfter=15
    )

    subtitle_style = ParagraphStyle(
        'ArabicSubTitle',
        parent=styles['Normal'],
        fontName='ArabicBold',
        fontSize=13,
        leading=18,
        alignment=1,
        textColor=colors.HexColor("#2D3748"),
        spaceAfter=25
    )

    h1_style = ParagraphStyle(
        'ArabicH1',
        parent=styles['Normal'],
        fontName='ArabicBold',
        fontSize=15,
        leading=20,
        alignment=2, # Right align for RTL
        textColor=colors.HexColor("#0D5C46"),
        spaceBefore=16,
        spaceAfter=10
    )

    h2_style = ParagraphStyle(
        'ArabicH2',
        parent=styles['Normal'],
        fontName='ArabicBold',
        fontSize=12,
        leading=17,
        alignment=2,
        textColor=colors.HexColor("#1A365D"), # Deep blue
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'ArabicBody',
        parent=styles['Normal'],
        fontName='Arabic',
        fontSize=10,
        leading=15,
        alignment=2,
        textColor=colors.HexColor("#2D3748"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'ArabicBullet',
        parent=styles['Normal'],
        fontName='Arabic',
        fontSize=9.5,
        leading=14,
        alignment=2,
        textColor=colors.HexColor("#333333"),
        spaceAfter=4,
        rightIndent=10
    )

    danger_style = ParagraphStyle(
        'ArabicDanger',
        parent=styles['Normal'],
        fontName='ArabicBold',
        fontSize=10,
        leading=14,
        alignment=2,
        textColor=colors.HexColor("#9B2C2C"),
        spaceAfter=4
    )

    story = []

    # Title & Banner
    story.append(Paragraph(prepare_arabic("🕌 منصة النور — Noor Platform"), title_style))
    story.append(Paragraph(prepare_arabic("التقرير الشامل للتدقيق الفني والأمني والمعماري وخارطة الطريق العالمية"), subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0D5C46"), spaceAfter=15))

    # Summary Box Table
    summary_data = [
        [
            Paragraph(prepare_arabic("<b>تاريخ الفحص:</b> أغسطس 2026<br/><b>الحالة العامة:</b> نموذج أولي متقدم يحتاج تأمين وإعادة هيكلة<br/><b>مستوى الأمان:</b> متوسط إلى منخفض (ثغرات SSRF و DoS حرجة)"), body_style),
            Paragraph(prepare_arabic("<b>اسم المشروع:</b> منصة النور (Noor Platform)<br/><b>التقنيات:</b> Next.js 16, React 19, Tailwind CSS 4, Zustand<br/><b>طبيعة المشروع:</b> منصة وسائط ومرجع إسلامي موزّع"), body_style)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[250, 260])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
        ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor("#86EFAC")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 15))

    # Section 1: Executive Summary
    story.append(Paragraph(prepare_arabic("1. الملخص التنفيذي ونظرة عامة على المشروع"), h1_style))
    story.append(Paragraph(prepare_arabic("منصة النور هي تطبيق ويب حديث يعتمد على تقنيات Next.js 16 و React 19 و Zustand و Tailwind CSS 4. تهدف المنصة إلى تجميع المحتوى الإسلامي المرئي والمسموع والكتب والفتاوى في واجهة موحدة، بالاعتماد على مستودعات GitHub و GitLab كقواعد بيانات موزعة."), body_style))
    story.append(Paragraph(prepare_arabic("أظهر الفحص الدقيق للكود البرمجي وجود بنية واجهة ممتازة، إلا أن هناك ثغرات أمنية خطيرة في واجهات الـ API ونقاط اختناق أدائية ومعمارية تمنع الموقع من الظهور في محركات البحث (Zero SEO) بسبب الاعتماد على التوجيه بالـ Hash."), body_style))
    story.append(Spacer(1, 10))

    # Section 2: Current Features
    story.append(Paragraph(prepare_arabic("2. المميزات ونقاط القوة الحالية"), h1_style))
    strengths = [
        "• التخزين اللامركزي الموزع عبر مستودعات Git وتوفير مصادر مرآة بديلة (Mirror Failover).",
        "• واجهة مستخدم عربية عصرية تدعم الاتجاه RTL مع الوضعين الفاتح والداكن (Light/Dark).",
        "• مشغل وسائط متعدد يدعم اليوتيوب، البث المباشر HLS، الصوتيات، الفيديوهات المباشرة، والكتب.",
        "• قارئ كتب متقدم مع دعم التكبير والبحث والتنقل وحفظ آخر موضع قراءة.",
        "• دعم تطبيق الويب التقدمي (PWA) وإمكانية حفظ الوسائط للعمل بدون إنترنت عبر IndexedDB.",
        "• تفكيك ذكي لأسماء المشايخ وتصنيف المواد تلقائياً وتوليد صور رمزية بديلة."
    ]
    for s in strengths:
        story.append(Paragraph(prepare_arabic(s), bullet_style))
    story.append(Spacer(1, 10))

    # Section 3: Security Vulnerabilities (CRITICAL)
    story.append(Paragraph(prepare_arabic("3. التقرير الأمني المفصل والثغرات المكتشفة"), h1_style))
    
    vuln_table_data = [
        [prepare_arabic("الحل الجذري المقترح"), prepare_arabic("مستوى الخطر"), prepare_arabic("الموقع في الكود"), prepare_arabic("الثغرة الأمنية")],
        [
            prepare_arabic("التحقق من DNS وحظر نطاقات الـ IP الخاصة (RFC 1918) وسحابة Metadata"),
            prepare_arabic("عالي جداً"),
            "api/download",
            prepare_arabic("طلب الخادم بالوكالة (SSRF)")
        ],
        [
            prepare_arabic("إصلاح شرط التحقق لرفض الروابط عديمة النطاق وفحص عناوين التحويل 3xx"),
            prepare_arabic("عالي"),
            "api/proxy/pdf\napi/pdf-page",
            prepare_arabic("تجاوز فحص النطاق المسموح")
        ],
        [
            prepare_arabic("إزالة التوجيه لـ y2mate بالكامل وإرجاع ردود JSON نظيفة وآمنة"),
            prepare_arabic("متوسط-عالي"),
            "api/download",
            prepare_arabic("تحويل لمواقع إعلانات احتيالية")
        ],
        [
            prepare_arabic("استبدال execSync بـ execFile اللامتزامن ووضع حد أقصى للحجم وتنظيف الكاش"),
            prepare_arabic("عالي"),
            "api/pdf-page\napi/pdf-info",
            prepare_arabic("تجميد الخادم واستنزاف القرص (DoS)")
        ],
        [
            prepare_arabic("بناء وحدة Rate Limiter معتمدة على IP ونافذة زمنية منزلقة"),
            prepare_arabic("متوسط"),
            "جميع الـ APIs",
            prepare_arabic("غياب محدد معدل الطلبات")
        ],
        [
            prepare_arabic("إضافة ترويسات CSP, HSTS, X-Frame-Options, X-Content-Type في next.config"),
            prepare_arabic("متوسط"),
            "next.config.ts",
            prepare_arabic("غياب ترويسات الحماية الصارمة")
        ]
    ]

    reshaped_vuln_table = []
    for row in vuln_table_data:
        reshaped_row = []
        for cell in row:
            reshaped_row.append(Paragraph(cell if isinstance(cell, str) and "\n" not in cell else prepare_arabic(cell), ParagraphStyle('tc', fontName='Arabic', fontSize=8, leading=11, alignment=1)))
        reshaped_vuln_table.append(reshaped_row)

    v_table = Table(reshaped_vuln_table, colWidths=[180, 70, 110, 150])
    v_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0D5C46")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#FFF5F5")]),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(v_table)
    story.append(Spacer(1, 15))

    # Section 4: Technical & Architectural Issues
    story.append(Paragraph(prepare_arabic("4. العيوب والمشاكل التقنية والمعمارية"), h1_style))
    tech_issues = [
        "• غياب الأرشفة ومحركات البحث (Zero SEO): الاعتماد على Single Page Application وتوجيه Hash (#/videos) يمنع جوجل ومحركات البحث من أرشفة آلاف الفتاوى والمحاضرات.",
        "• تحميل ومعالجة البيانات من طرف العميل (Client-Side Overload): المتصفح يطلب عشرات ملفات JSON ويفرز 40,000 عنصر في الذاكرة مما يسبب بطء واستهلاك بطارية الهاتف.",
        "• قاعدة بيانات Prisma و SQLite غير مربوطة: وجود جداول وهمية غير مستخدمة بينما البيانات الحقيقية محصورة في ملفات مؤقتة.",
        "• محرك بحث نصي بدائي: الاعتماد على string.includes() البسيط دون دعم معالجة اللغة العربية الصرفية (توحيد الهمزات والتشكيل والبحث بالجذر).",
        "• مسارات نظام ثابتة خاصة بلينكس: وجود مسارات مثل /home/z/.local/bin/yt-dlp و /tmp تسبب فشل التشغيل على خوادم ويندوز و Docker."
    ]
    for issue in tech_issues:
        story.append(Paragraph(prepare_arabic(issue), bullet_style))
    story.append(Spacer(1, 10))

    # Section 5: Global Islamic Reference Roadmap
    story.append(Paragraph(prepare_arabic("5. خارطة الطريق: كيف نجعل الموقع مرجعاً إسلامياً عالمياً؟"), h1_style))
    
    pillars = [
        ("أ. القرآن الكريم وعلومه:", "مصحف إلكتروني عالي الدقة، تلاوة مزامنة آية بآية لأكثر من 100 قارئ، 8 تفاسير معتمدة (ابن كثير، الطبري، القرطبي، السعدي، الميسر...)، أسباب النزول وترجمة معاني الآيات لأكثر من 20 لغة."),
        ("ب. الموسوعة الحديثية الكبرى:", "دمج الكتب التسعة (البخاري، مسلم، أبو داود، الترمذي، النسائي، ابن ماجه، موطأ مالك، مسند أحمد، الدارمي) مع بيان درجة الحديث وشروحه المعتمدة والبحث بالجذر اللغوي."),
        ("ج. بنك الفتاوى والموسوعة الفقهية:", "تصنيف هرمي فقهي للأبواب (الطهارة، الصلاة، المعاملات...) وفهرسة فتاوى كبار العلماء واللجان المعتمدة مع التوثيق برقم الصفحة والمجلد."),
        ("د. الخدمات التفاعلية اليومية:", "مواقيت الصلاة الدقيقة عالمياً بمعادلات معتمدة، بوصلة القبلة التفاعلية، التقويم الهجري والمناسبات، حصن المسلم مع سبحة وعداد ذكي."),
        ("هـ. التوسع العالمي واللغات:", "واجهة ومحتوى بـ 10+ لغات عالمية (الإنجليزية، الفرنسية، الأردية، الإندونيسية، التركية، الروسية، الهوسا، البنغالية...) مع بحث ذكي مدعوم بالذكاء الاصطناعي.")
    ]
    for p_title, p_desc in pillars:
        story.append(Paragraph(prepare_arabic(f"<b>{p_title}</b> {p_desc}"), bullet_style))
    story.append(Spacer(1, 10))

    # Section 6: Action Plan & Engineering
    story.append(Paragraph(prepare_arabic("6. خطة التطوير البرمجي والهندسي المباشر"), h1_style))
    steps = [
        "1. إغلاق كافة الثغرات الأمنية (SSRF, Host Validation, DoS, Rate Limiting, CSP Headers) فوراً.",
        "2. الانتقال إلى مسارات Next.js الحقيقية (App Router) مع تقنية التوليد الثابت التدريجي (ISR) لضمان أرشفة جوجل وتصدر نتائج البحث.",
        "3. نقل معالجة البيانات إلى الخادم وقاعدة بيانات مفهرسة (PostgreSQL / SQLite FTS5) ومحرك بحث فائق السرعة.",
        "4. إضافة مشغل صوتي عائم دائم (Sticky Mini Player) مع دعم MediaSession للتحكم من شاشة القفل ومؤقت النوم."
    ]
    for st in steps:
        story.append(Paragraph(prepare_arabic(st), bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Audit PDF successfully created at: {output_path}")

if __name__ == "__main__":
    out = "Noor_Platform_Audit_Report.pdf"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    create_audit_pdf(out)
