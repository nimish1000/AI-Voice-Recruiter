"use client";

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Database, Users } from 'lucide-react';

interface User {
  id: string;
  clerkId: string | null;
  email: string;
  name: string | null;
  role: string | null;
  emailVerified: boolean | null;
  createdAt: string;
}

interface DbStatus {
  success: boolean;
  count: number;
  users: User[];
  error?: string;
}

export default function DbStatusPage() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/test-db')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch((err) => {
        setStatus({
          success: false,
          count: 0,
          users: [],
          error: err.message,
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">Checking database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Database Sync Status
          </h1>
          <p className="text-gray-400">
            Check if users are being saved to your database
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            {status?.success ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <h2 className="text-xl font-bold text-white">Database Connected</h2>
              </>
            ) : (
              <>
                <XCircle className="h-8 w-8 text-red-500" />
                <h2 className="text-xl font-bold text-white">Database Error</h2>
              </>
            )}
          </div>

          {status?.error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{status.error}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Total Users</span>
              </div>
              <p className="text-3xl font-bold text-white">{status?.count || 0}</p>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-green-400" />
                <span className="text-gray-400 text-sm">Status</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {status?.success ? '✅ Working' : '❌ Failed'}
              </p>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-purple-400" />
                <span className="text-gray-400 text-sm">Webhook</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {status?.count !== undefined ? '📡 Active' : '⚠️ Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        {status?.users && status.users.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8">
            <h3 className="text-xl font-bold text-white mb-6">Saved Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                      Clerk ID
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                      Verified
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {status.users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-800 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-white">{user.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {user.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-gray-400">
                        {user.clerkId || 'Not linked'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {user.role || 'user'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {user.emailVerified ? (
                          <span className="text-green-400">✓ Yes</span>
                        ) : (
                          <span className="text-yellow-400">⚠ No</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {status?.users && status.users.length === 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 text-center">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Users Found</h3>
            <p className="text-gray-400 mb-6">
              The database is empty. Sign up a user to test the integration.
            </p>
            <div className="space-y-4">
              <ol className="text-left text-sm text-gray-400 space-y-2 max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Visit <code className="bg-gray-900 px-2 py-1 rounded">/sign-up</code> and create an account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Check console for webhook logs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>Refresh this page to see the new user</span>
                </li>
              </ol>
              <a
                href="/sign-up"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Go to Sign Up
              </a>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700/50 rounded-xl p-6">
          <h4 className="font-semibold text-blue-300 mb-3">Need Help?</h4>
          <ul className="space-y-2 text-sm text-blue-200/80">
            <li>• Check Clerk Dashboard → Webhooks for delivery status</li>
            <li>• Verify CLERK_WEBHOOK_SECRET is set in .env</li>
            <li>• For local dev, use ngrok to expose webhook URL</li>
            <li>• Review console logs for error messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
