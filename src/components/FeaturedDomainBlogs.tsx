import { useState } from 'react';
import { ArrowUpRight, Calendar, User, X } from 'lucide-react';
import heroCampusImg from '../assets/images/hero_ap_university_campus_1794844976315.jpg';
import heroLibraryImg from '../assets/images/hero_ap_library_students_1794844975826.jpg';
import heroLabImg from '../assets/images/hero_ap_engineering_lab_1794844976206.jpg';
import sectorSeminarImg from '../assets/images/sector_ap_careers_seminar_1794847411888.jpg';
import blogDegreeImg from '../assets/images/blog_ap_degree_campus_1794847413899.jpg';
import { useLanguage } from '../context/LanguageContext.tsx';

interface DomainGuide {
  id: string;
  domain: string;
  title: string;
  excerpt: string;
  author: string;
  readTime: string;
  date: string;
  accentStrip: string;
  image: string;
  fullContent: string[];
}

const DOMAIN_BLOGS: DomainGuide[] = [
  {
    id: 'blog-eng-ai',
    domain: 'Engineering & AI',
    title: 'Choosing Between CSE, AI & ML, and Core Engineering in AP EAPCET 2026',
    excerpt:
      'A practical branch-by-branch breakdown of curriculum depth, laboratory infrastructure, and university pathways across Andhra Pradesh.',
    author: 'ASH Academic Advisory Desk',
    readTime: '6 min read',
    date: 'Nov 14, 2026',
    accentStrip: 'bg-[#0F2547]',
    image: heroLabImg,
    fullContent: [
      'Selecting an engineering specialisation during AP EAPCET web options requires evaluating laboratory equipment, faculty depth, and university affiliation across Visakhapatnam, Vijayawada, Guntur, Kakinada, and Tirupati.',
      'While Computer Science and AI/ML remain popular for software engineering, Electronics (ECE), Electrical (EEE), and Mechanical Engineering provide strong foundations for semiconductor design, core manufacturing, and GATE/ESE public-sector examinations.',
    ],
  },
  {
    id: 'blog-competitive-exams',
    domain: 'Competitive Exams',
    title: 'AP EAPCET, ICET & GATE 2026–27: Verification & Document Checklist',
    excerpt:
      'Step-by-step preparation strategy, helpline center certificate verification rules, and web-option locking guidelines for AP students.',
    author: 'ASH Admissions Reference Cell',
    readTime: '5 min read',
    date: 'Nov 12, 2026',
    accentStrip: 'bg-[#1E3A8A]',
    image: heroLibraryImg,
    fullContent: [
      'State entrance counselling moves rapidly between rank card publication, certificate verification, and seat allotment. Keep original and attested copies of SSC, Intermediate marks memos, income, caste, and EWS certificates ready ahead of dates.',
      'Final-year B.Tech and Degree students preparing for GATE, AP ICET, APPSC Group-II, or UPSC Civil Services should review official commission syllabi alongside IIT/IIM SWAYAM-NPTEL electives.',
    ],
  },
  {
    id: 'blog-degree-career',
    domain: 'Degree & Career',
    title: 'High-Growth Pathways After B.Sc Computer Science, B.Com & BBA Honours',
    excerpt:
      'How autonomous degree students in Andhra Pradesh can combine undergraduate Honours credits with analytics, public policy, and competitive exam tracks.',
    author: 'ASH Collegiate Career Desk',
    readTime: '7 min read',
    date: 'Nov 10, 2026',
    accentStrip: 'bg-[#9A7B2C]',
    image: blogDegreeImg,
    fullContent: [
      'Under the four-year Honours framework across AP universities and OAMDC colleges, B.Sc, B.Com, and B.A. students gain applied project credits and mandatory semester internships.',
      'Pairing undergraduate coursework with Python data analysis, financial accounting certifications, or structured civil services preparation opens both corporate and government recruitment avenues.',
    ],
  },
  {
    id: 'blog-scholarships',
    domain: 'Scholarships & Aid',
    title: 'Post-Matric Fee Reimbursement & NPCI Bank Seeding Guide for Students',
    excerpt:
      'Essential documentation, 75% biometric attendance norms, and college nodal officer verification rules for Jnanabhumi RTF/MTF & NSP renewals.',
    author: 'ASH Student Welfare Desk',
    readTime: '4 min read',
    date: 'Nov 08, 2026',
    accentStrip: 'bg-[#EA580C]',
    image: sectorSeminarImg,
    fullContent: [
      'Timely biometric authentication at your college administrative office and active NPCI Aadhaar-bank mapping are required for smooth Post-Matric tuition (RTF) and maintenance (MTF) disbursements.',
      'Students should verify scholarship renewal status directly on jnanabhumi.ap.gov.in or scholarships.gov.in and raise attendance discrepancy grievances promptly with their college nodal officer.',
    ],
  },
  {
    id: 'blog-campus-governance',
    domain: 'Engineering & AI',
    title: 'Understanding NAAC, NBA & UGC Autonomous Status Across AP Campuses',
    excerpt:
      'How institutional autonomy, university affiliation, and statutory fee orders protect transparency and academic credit mobility.',
    author: 'ASH Institutional Quality Desk',
    readTime: '5 min read',
    date: 'Nov 05, 2026',
    accentStrip: 'bg-[#0F2547]',
    image: heroCampusImg,
    fullContent: [
      'Before shortlisting any institution, students and parents should check whether the college operates as a State University constituent, Deemed University, Private University, or UGC Autonomous institution.',
      'ASH displays source attributions and official college portal links on every verified profile so families can cross-check statutory disclosures accurately.',
    ],
  },
];

export function FeaturedDomainBlogs() {
  const { t } = useLanguage();
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [activeArticle, setActiveArticle] = useState<DomainGuide | null>(null);

  const domains = [
    'All',
    'Engineering & AI',
    'Competitive Exams',
    'Degree & Career',
    'Scholarships & Aid',
  ];

  const filteredBlogs =
    selectedDomain === 'All'
      ? DOMAIN_BLOGS
      : DOMAIN_BLOGS.filter((b) => b.domain === selectedDomain);

  return (
    <section className="max-w-[1360px] mx-auto px-4 sm:px-6 py-14 border-t border-slate-200">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9A7B2C]">
            Student Knowledge &amp; Domain Insights
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-[#0F2547] sm:text-3xl">
            {t.featuredBlogsTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Curated admission guides, branch comparisons, and competitive exam strategies for Andhra Pradesh students.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter domain guides">
          {domains.map((dom) => (
            <button
              key={dom}
              type="button"
              role="tab"
              aria-selected={selectedDomain === dom}
              onClick={() => setSelectedDomain(dom)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedDomain === dom
                  ? 'bg-[#0F2547] text-white'
                  : 'bg-[#FBF9F4] border border-slate-200 text-slate-700 hover:border-[#0F2547]'
              }`}
            >
              {dom}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredBlogs.map((blog) => (
          <article
            key={blog.id}
            onClick={() => setActiveArticle(blog)}
            className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-[#FBF9F4]/60 transition hover:-translate-y-0.5 hover:bg-white hover:border-[#0F2547] hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="relative">
                <div className={`h-10 w-full ${blog.accentStrip}`} />
                <div className="mx-5 -mt-6 overflow-hidden rounded-lg border-4 border-white bg-white shadow-sm">
                  <img
                    src={blog.image}
                    alt={blog.title}
                    loading="lazy"
                    className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
              </div>

              <div className="p-5 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#9A7B2C]">
                  {blog.domain}
                </p>
                <h3 className="mt-2 font-serif text-lg font-semibold leading-snug text-[#0F2547] group-hover:text-[#EA580C]">
                  {blog.title}
                </h3>
                <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-slate-600">
                  {blog.excerpt}
                </p>
              </div>
            </div>

            <div className="mx-5 mb-5 flex items-center justify-between border-t border-slate-200/80 pt-3 text-xs font-medium text-slate-500">
              <span>{blog.readTime}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[#1E3A8A] group-hover:text-[#EA580C]">
                Read Guide
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </article>
        ))}
      </div>

      {activeArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="blog-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A192F]/75 p-4 backdrop-blur-sm"
        >
          <div className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveArticle(null)}
              aria-label="Close guide"
              className="absolute right-4 top-4 z-10 rounded-full bg-white/95 p-2 text-[#0F2547] shadow hover:bg-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <img
              src={activeArticle.image}
              alt={activeArticle.title}
              className="h-60 w-full object-cover"
            />

            <div className="p-6 sm:p-8 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9A7B2C]">
                {activeArticle.domain}
              </p>
              <h3 id="blog-modal-title" className="font-serif text-2xl font-semibold text-[#0F2547] leading-snug">
                {activeArticle.title}
              </h3>

              <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#9A7B2C]" />
                  {activeArticle.author}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#9A7B2C]" />
                  {activeArticle.date}
                </span>
                <span>{activeArticle.readTime}</span>
              </div>

              <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                {activeArticle.fullContent.map((para) => (
                  <p key={para}>{para}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
