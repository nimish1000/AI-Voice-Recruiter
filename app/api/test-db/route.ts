import { NextResponse } from 'next/server';
import { db, users } from '@/lib/db';

export async function GET() {
  try {
    // Get all users from database
    const allUsers = await db.select().from(users);
    
    return NextResponse.json({
      success: true,
      count: allUsers.length,
      users: allUsers.map(user => ({
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
