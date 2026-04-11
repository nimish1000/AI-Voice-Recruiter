import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './lib/db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  try {
    const res = await db.insert(schema.candidates).values({
      name: 'Juliana Silva',
      email: `hello@reallygreatsite.com`,
      phone: '+123-456-7890',
      resume: 'White Navy Modern Professional Marketing Executive CV Resume.pdf',
      skills: ["Team Player", "Analytical Thinking", "Time Management"],
      experience: 12,
      status: 'applied',
      notes: 'Results-driven Marketing Executive with 12 years of experience in marketing, leading to double digit growth yearly with expertise in planning and execution of integrated marketing plans.',
    }).returning();
    console.log('Inserted Juliana success');
  } catch (err: any) {
    console.error('DB Error code:', err?.code);
    console.error('DB Error name:', err?.name);
    console.error('DB Error message:', err?.message);
    if (err.cause) {
      console.error('DB Error cause:', err.cause);
    }
  }
}
main().catch(console.error);
