import React, { createContext, useContext, useEffect, useState } from 'react';

export type SupportedLangCode = 'en' | 'te' | 'ur' | 'hi' | 'ar' | 'bn' | 'fr' | 'sw';

export interface LanguageOption {
  code: SupportedLangCode;
  label: string;
  native: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', dir: 'ltr' },
  { code: 'ur', label: 'Urdu', native: 'اردو', dir: 'rtl' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', dir: 'ltr' },
  { code: 'fr', label: 'French', native: 'Français', dir: 'ltr' },
  { code: 'sw', label: 'Swahili', native: 'Kiswahili', dir: 'ltr' },
];

export interface UiTranslations {
  portalTitle: string;
  portalSubtitle: string;
  skipToContent: string;
  standardView: string;
  highContrast: string;
  navHome: string;
  navDirectory: string;
  navServicesFees: string;
  navScholarships: string;
  navCareersUpsc: string;
  navAbout: string;
  shortlist: string;
  examSidebarTitle: string;
  featuredBlogsTitle: string;
  circularsTitle: string;
  feeGuidanceTitle: string;
}

export const UI_TRANSLATIONS: Record<SupportedLangCode, UiTranslations> = {
  en: {
    portalTitle: 'Andhra Student Hub',
    portalSubtitle: 'Andhra Pradesh Higher Education Digital Platform',
    skipToContent: 'Skip to Main Content',
    standardView: 'Standard View',
    highContrast: 'High Contrast',
    navHome: 'Home',
    navDirectory: 'Directory',
    navServicesFees: 'Services & Fees',
    navScholarships: 'Scholarships',
    navCareersUpsc: 'Careers & UPSC',
    navAbout: 'About ASH',
    shortlist: 'My Shortlist',
    examSidebarTitle: 'Exams & Career Guidance',
    featuredBlogsTitle: 'Featured Guides by Academic Domain',
    circularsTitle: 'Latest Circulars & Orders — Competitive Exams, UPSC & AP EAPCET',
    feeGuidanceTitle: 'College Fees & Admissions Guidance',
  },
  te: {
    portalTitle: 'ఆంధ్ర స్టూడెంట్ హబ్',
    portalSubtitle: 'ఆంధ్రప్రదేశ్ ఉన్నత విద్యా డిజిటల్ వేదిక',
    skipToContent: 'ప్రధాన విషయానికి వెళ్ళండి',
    standardView: 'సాధారణ వీక్షణ',
    highContrast: 'హై కాంట్రాస్ట్',
    navHome: 'హోమ్',
    navDirectory: 'కళాశాలల డైరెక్టరీ',
    navServicesFees: 'సేవలు & ఫీజులు',
    navScholarships: 'స్కాలర్‌షిప్‌లు',
    navCareersUpsc: 'కెరీర్ & UPSC',
    navAbout: 'ASH గురించి',
    shortlist: 'నా షార్ట్‌లిస్ట్',
    examSidebarTitle: 'పోటీ పరీక్షలు & కెరీర్ గైడెన్స్',
    featuredBlogsTitle: 'అకడమిక్ విభాగాల వారీగా మార్గదర్శకాలు',
    circularsTitle: 'తాజా సర్క్యులర్లు & ఉత్తర్వులు — పోటీ పరీక్షలు, UPSC & AP EAPCET',
    feeGuidanceTitle: 'కళాశాల ఫీజులు & అడ్మిషన్ల మార్గదర్శకత్వం',
  },
  ur: {
    portalTitle: 'آندھرا اسٹوڈنٹ ہب',
    portalSubtitle: 'آندھرا پردیش اعلیٰ تعلیم ڈیجیٹل پلیٹ فارم',
    skipToContent: 'مرکزی مواد پر جائیں',
    standardView: 'معیاری منظر',
    highContrast: 'ہائی کنٹراسٹ',
    navHome: 'ہوم',
    navDirectory: 'ڈائریکٹری',
    navServicesFees: 'خدمات اور فیس',
    navScholarships: 'وظائف',
    navCareersUpsc: 'کیریئر اور UPSC',
    navAbout: 'ہمارے بارے میں',
    shortlist: 'میری شارٹ لسٹ',
    examSidebarTitle: 'امتحانات اور کیریئر رہنمائی',
    featuredBlogsTitle: 'تعلیمی شعبے کے لحاظ سے رہنما تحریریں',
    circularsTitle: 'تازہ ترین سرکلرز اور احکامات',
    feeGuidanceTitle: 'کالج فیس اور داخلہ رہنمائی',
  },
  hi: {
    portalTitle: 'आंध्र स्टूडेंट हब',
    portalSubtitle: 'आंध्र प्रदेश उच्च शिक्षा डिजिटल प्लेटफ़ॉर्म',
    skipToContent: 'मुख्य सामग्री पर जाएं',
    standardView: 'मानक दृश्य',
    highContrast: 'उच्च कंट्रास्ट',
    navHome: 'होम',
    navDirectory: 'निर्देशिका',
    navServicesFees: 'सेवाएं और शुल्क',
    navScholarships: 'छात्रवृत्ति',
    navCareersUpsc: 'करियर और UPSC',
    navAbout: 'ASH परिचय',
    shortlist: 'मेरी शॉर्टलिस्ट',
    examSidebarTitle: 'प्रतियोगी परीक्षाएं और करियर मार्गदर्शन',
    featuredBlogsTitle: 'शैक्षणिक क्षेत्र के अनुसार प्रमुख मार्गदर्शिकाएँ',
    circularsTitle: 'नवीनतम परिपत्र और आदेश — UPSC व AP EAPCET',
    feeGuidanceTitle: 'कॉलेज शुल्क और प्रवेश मार्गदर्शन',
  },
  ar: {
    portalTitle: 'مركز طلاب أندرا',
    portalSubtitle: 'منصة التعليم العالي الرقمية في أندرا براديش',
    skipToContent: 'انتقل إلى المحتوى الرئيسي',
    standardView: 'العرض القياسي',
    highContrast: 'تباين عالٍ',
    navHome: 'الرئيسية',
    navDirectory: 'الدليل',
    navServicesFees: 'الخدمات والرسوم',
    navScholarships: 'المنح الدراسية',
    navCareersUpsc: 'المسار المهني و UPSC',
    navAbout: 'حول المنصة',
    shortlist: 'قائمتي المختصرة',
    examSidebarTitle: 'الامتحانات التنافسية والتوجيه المهني',
    featuredBlogsTitle: 'أدلة أكاديمية حسب التخصص',
    circularsTitle: 'أحدث التعميمات والأوامر الرسمية',
    feeGuidanceTitle: 'إرشادات الرسوم الجامعية والقبول',
  },
  bn: {
    portalTitle: 'অন্ধ্র স্টুডেন্ট হাব',
    portalSubtitle: 'অন্ধ্রপ্রদেশ উচ্চশিক্ষা ডিজিটাল প্ল্যাটফর্ম',
    skipToContent: 'মূল বিষয়বস্তুতে যান',
    standardView: 'স্ট্যান্ডার্ড ভিউ',
    highContrast: 'উচ্চ বৈসাদৃশ্য',
    navHome: 'হোম',
    navDirectory: 'ডিরেক্টরি',
    navServicesFees: 'পরিষেবা ও ফি',
    navScholarships: 'বৃত্তি',
    navCareersUpsc: 'ক্যারিয়ার ও UPSC',
    navAbout: 'ASH সম্পর্কে',
    shortlist: 'আমার শর্টলিস্ট',
    examSidebarTitle: 'প্রতিযোগিতামূলক পরীক্ষা ও ক্যারিয়ার গাইডেন্স',
    featuredBlogsTitle: 'একাডেমিক ডোমেইন অনুযায়ী নির্বাচিত নির্দেশিকা',
    circularsTitle: 'সর্বশেষ বিজ্ঞপ্তি ও আদেশ — UPSC এবং AP EAPCET',
    feeGuidanceTitle: 'কলেজ ফি ও ভর্তি নির্দেশিকা',
  },
  fr: {
    portalTitle: 'Andhra Student Hub',
    portalSubtitle: "Plateforme Numérique d'Enseignement Supérieur d'Andhra Pradesh",
    skipToContent: 'Aller au contenu principal',
    standardView: 'Vue standard',
    highContrast: 'Contraste élevé',
    navHome: 'Accueil',
    navDirectory: 'Annuaire',
    navServicesFees: 'Services & Frais',
    navScholarships: 'Bourses',
    navCareersUpsc: 'Carrières & UPSC',
    navAbout: 'À propos',
    shortlist: 'Ma Sélection',
    examSidebarTitle: 'Concours & Orientation Professionnelle',
    featuredBlogsTitle: 'Guides à la Une par Domaine Académique',
    circularsTitle: 'Dernières Circulaires & Arrêtés — UPSC et AP EAPCET',
    feeGuidanceTitle: "Conseil en Frais de Scolarité et d'Admission",
  },
  sw: {
    portalTitle: 'Andhra Student Hub',
    portalSubtitle: 'Jukwaa la Kidijitali la Elimu ya Juu Andhra Pradesh',
    skipToContent: 'Ruka hadi Maudhui Kuu',
    standardView: 'Mwonekano wa Kawaida',
    highContrast: 'Utofautishaji wa Juu',
    navHome: 'Nyumbani',
    navDirectory: 'Orodha ya Vyuo',
    navServicesFees: 'Huduma na Ada',
    navScholarships: 'Udhamini',
    navCareersUpsc: 'Kazi na UPSC',
    navAbout: 'Kuhusu ASH',
    shortlist: 'Orodha Yangu',
    examSidebarTitle: 'Mitihani ya Ushindani na Mwongozo wa Kazi',
    featuredBlogsTitle: 'Miongozo Bora kwa Kila Taaluma',
    circularsTitle: 'Nyaraka na Maagizo Mapya — UPSC na AP EAPCET',
    feeGuidanceTitle: 'Mwongozo wa Ada za Vyuo na Udahili',
  },
};

const STORAGE_KEY = 'ash_lang';

interface LanguageContextValue {
  lang: SupportedLangCode;
  setLang: (code: SupportedLangCode) => void;
  t: UiTranslations;
  currentOption: LanguageOption;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLangCode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLangCode | null;
    return saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved) ? saved : 'en';
  });

  const currentOption = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    document.documentElement.dir = currentOption.dir;
    document.documentElement.lang = currentOption.code;
  }, [currentOption]);

  const setLang = (code: SupportedLangCode) => {
    setLangState(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t: UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.en,
        currentOption,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
