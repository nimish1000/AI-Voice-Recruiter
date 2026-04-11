import { pgTable, text, timestamp, varchar, uuid, integer, boolean } from 'drizzle-orm/pg-core';

// Users table with Clerk integration
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 255 }).unique(), // Clerk user ID
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  password: text('password').notNull(), // Placeholder for Clerk users
  role: varchar('role', { length: 50 }).default('user'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Example candidates table for AI recruiter functionality
export const candidates = pgTable('candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  resume: text('resume'),
  skills: text('skills').array(),
  experience: integer('experience'), // years of experience
  status: varchar('status', { length: 50 }).default('applied'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Example jobs table
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  requirements: text('requirements').array(),
  location: varchar('location', { length: 255 }),
  type: varchar('type', { length: 50 }).default('full-time'),
  status: varchar('status', { length: 50 }).default('open'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Example applications table (junction table between candidates and jobs)
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').references(() => candidates.id, { onDelete: 'cascade' }).notNull(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  coverLetter: text('cover_letter'),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Interview sessions table
export const interviews = pgTable('interviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  interviewId: varchar('interview_id', { length: 255 }).notNull().unique(), // Public interview ID from URL
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }),
  candidateName: varchar('candidate_name', { length: 255 }).notNull(),
  candidateEmail: varchar('candidate_email', { length: 255 }),
  interviewType: varchar('interview_type', { length: 100 }),
  status: varchar('status', { length: 50 }).default('scheduled'), // scheduled, in_progress, completed, cancelled
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // in seconds
  recruiterId: varchar('recruiter_id', { length: 255 }), // Clerk ID of the recruiter
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Interview responses table
export const interviewResponses = pgTable('interview_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  interviewId: uuid('interview_id').references(() => interviews.id, { onDelete: 'cascade' }).notNull(),
  questionNumber: integer('question_number').notNull(),
  question: text('question').notNull(),
  category: varchar('category', { length: 100 }),
  userResponse: text('user_response'),
  responseTimestamp: timestamp('response_timestamp').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Interview summaries table
export const interviewSummaries = pgTable('interview_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  interviewId: uuid('interview_id').references(() => interviews.id, { onDelete: 'cascade' }).notNull(),
  overallScore: integer('overall_score'), // 1-100
  recommendation: varchar('recommendation', { length: 50 }), // strong_hire, hire, no_hire, strong_no_hire
  summary: text('summary').notNull(),
  strengths: text('strengths').array(),
  weaknesses: text('weaknesses').array(),
  technicalScore: integer('technical_score'),
  communicationScore: integer('communication_score'),
  culturalFitScore: integer('cultural_fit_score'),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});

// Recruiter settings table
export const recruiterSettings = pgTable('recruiter_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 255 }).unique().notNull(),
  agentName: varchar('agent_name', { length: 255 }).default('AI Recruiter'),
  systemPrompt: text('system_prompt'),
  questionCount: integer('question_count').default(8),
  voiceId: varchar('voice_id', { length: 255 }),
  autoInvite: boolean('auto_invite').default(true),
  companyName: varchar('company_name', { length: 255 }).default('AI Recruitment Platform'),
  companyDescription: text('company_description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;
export type InterviewResponse = typeof interviewResponses.$inferSelect;
export type NewInterviewResponse = typeof interviewResponses.$inferInsert;
export type InterviewSummary = typeof interviewSummaries.$inferSelect;
export type NewInterviewSummary = typeof interviewSummaries.$inferInsert;
export type RecruiterSettings = typeof recruiterSettings.$inferSelect;
export type NewRecruiterSettings = typeof recruiterSettings.$inferInsert;
