import { count } from 'drizzle-orm';
import { db } from '../src/db/index.ts';
import { careerExams, colleges, notices, nptelTracks, scholarships } from '../src/db/schema.ts';
import { seedPublicReferenceData } from './seedData.ts';

async function main() {
  await seedPublicReferenceData();
  const [c] = await db.select({ value: count() }).from(colleges);
  const [s] = await db.select({ value: count() }).from(scholarships);
  const [e] = await db.select({ value: count() }).from(careerExams);
  const [n] = await db.select({ value: count() }).from(nptelTracks);
  const [nt] = await db.select({ value: count() }).from(notices);

  console.log('ASH Cloud SQL PostgreSQL reference seed complete:', {
    colleges: c.value,
    scholarships: s.value,
    exams: e.value,
    nptel: n.value,
    notices: nt.value,
  });
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed CLI failed:', err);
  process.exit(1);
});
