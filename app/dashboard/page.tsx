import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { DashboardLayout } from '@/components/dashboard-layout';
import { TestEmailButton } from '@/components/dashboard/test-email-button';

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // Get user data from database
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  // Fetch jobs to calculate statistics
  const allJobs = await db.query.jobs.findMany();
  
  const totalJobs = allJobs.length;
  // Based on your database, active jobs have status 'active' or 'open'
  const activeJobs = allJobs.filter(job => job.status === 'active' || job.status === 'open').length;
  const expiredJobs = totalJobs - activeJobs;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            Welcome to Your Dashboard
          </h1>
          <p className="text-gray-400">
            Manage your AI Recruiter account and settings
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-900/40 backdrop-blur-sm rounded-xl border border-blue-700/50 p-6 flex items-center shadow-lg">
            <div className="p-4 bg-blue-500/20 rounded-full mr-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </div>
            <div>
              <p className="text-sm text-blue-300 font-medium">Total Jobs</p>
              <h3 className="text-3xl font-bold text-white">{totalJobs}</h3>
            </div>
          </div>

          <div className="bg-emerald-900/40 backdrop-blur-sm rounded-xl border border-emerald-700/50 p-6 flex items-center shadow-lg">
            <div className="p-4 bg-emerald-500/20 rounded-full mr-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <p className="text-sm text-emerald-300 font-medium">Active Jobs</p>
              <h3 className="text-3xl font-bold text-white">{activeJobs}</h3>
            </div>
          </div>

          <div className="bg-red-900/40 backdrop-blur-sm rounded-xl border border-red-700/50 p-6 flex items-center shadow-lg">
            <div className="p-4 bg-red-500/20 rounded-full mr-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <p className="text-sm text-red-300 font-medium">Expired/Closed Jobs</p>
              <h3 className="text-3xl font-bold text-white">{expiredJobs}</h3>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700 p-4 sm:p-6 lg:p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Account Information</h2>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">User ID</label>
              <p className="text-white font-mono text-sm break-all">{userId}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Email</label>
              <p className="text-white">{user?.email || 'Not available'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Name</label>
              <p className="text-white">{user?.name || 'Not set'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Role</label>
              <p className="text-white capitalize">{user?.role || 'user'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Email Verified</label>
              <p className="text-white">
                {user?.emailVerified ? (
                  <span className="text-green-400">✓ Verified</span>
                ) : (
                  <span className="text-yellow-400">⚠ Not Verified</span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Member Since</label>
              <p className="text-white">
                {user?.createdAt 
                  ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Automated Interview Agent</h3>
            <p className="text-sm text-gray-400 mb-4">
              Test your automated email configuration to ensure candidates receive their interview links.
            </p>
            <div className="max-w-xs">
              <TestEmailButton userEmail={user?.email || ''} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <a
            href="/dashboard/candidates"
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all cursor-pointer group"
          >
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">Candidates</h3>
            <p className="text-gray-400 text-sm">
              Manage and track job candidates
            </p>
          </a>

          <a
            href="/dashboard/jobs"
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all cursor-pointer group"
          >
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">Jobs</h3>
            <p className="text-gray-400 text-sm">
              Create and manage job postings
            </p>
          </a>

          <a
            href="/interview/int_12345_demo"
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all cursor-pointer group"
          >
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">Test Interview</h3>
            <p className="text-gray-400 text-sm">
              Try the interview portal (demo)
            </p>
          </a>
        </div>

        {/* Database Integration Notice */}
        <div className="mt-8 bg-blue-900/30 backdrop-blur-sm rounded-xl border border-blue-700/50 p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">
            ✓ Database Integration Active
          </h3>
          <p className="text-blue-200/80 text-sm">
            Your account information is automatically synced with our database. 
            This dashboard demonstrates the Clerk + NeonDB integration working together.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
