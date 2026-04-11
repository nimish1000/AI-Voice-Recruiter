import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, UserJSON } from '@clerk/nextjs/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      'Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with the secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  // Get the type and data from the event
  const eventType = evt.type;
  const eventData = evt.data;

  console.log(`Received webhook with ID ${eventData.id} and type of ${eventType}`);

  // Handle different event types
  switch (eventType) {
    case 'user.created': {
      // Save new user to database when they sign up
      try {
        const userData = eventData as UserJSON;
        await db.insert(users).values({
          clerkId: userData.id,
          email: userData.email_addresses[0].email_address,
          name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null,
          password: 'clerk-auth', // Placeholder since Clerk handles authentication
          role: 'user',
          emailVerified: (userData as any).email_verified || false,
        });

        console.log(`User ${userData.email_addresses[0].email_address} saved to database`);
      } catch (error) {
        console.error('Error saving user to database:', error);
        return new Response('Error saving user to database', {
          status: 500,
        });
      }
      break;
    }

    case 'user.updated': {
      // Update user information when they update their profile
      try {
        const userData = eventData as UserJSON;
        await db.update(users)
          .set({
            name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null,
            email: userData.email_addresses[0]?.email_address,
            emailVerified: (userData as any).email_verified || false,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, userData.id!));

        console.log(`User ${userData.id} updated in database`);
      } catch (error) {
        console.error('Error updating user in database:', error);
      }
      break;
    }

    case 'user.deleted': {
      // Delete user from database when they delete their Clerk account
      try {
        const userId = eventData.id;
        if (userId) {
          await db.delete(users).where(eq(users.clerkId, userId));
          console.log(`User ${userId} deleted from database`);
        }
      } catch (error) {
        console.error('Error deleting user from database:', error);
      }
      break;
    }

    default: {
      console.log(`Unhandled event type: ${eventType}`);
    }
  }

  return new Response('', { status: 200 });
}
