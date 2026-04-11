# 🚀 Quick Start Guide - Clerk Authentication

## 5-Minute Setup

### 1. Create Clerk Account (2 minutes)
1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up for free
3. Click **"Create Application"**
4. Choose **"Next.js"**
5. Enable email authentication + any social providers you want

### 2. Copy Your API Keys (1 minute)
In Clerk Dashboard → **API Keys**:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_... (from Webhooks section)
```

Paste these in your `.env` file (replace the placeholder values).

### 3. Set Up Webhook (2 minutes)

**For Local Development:**
1. Install ngrok: `npm install -g ngrok`
2. Run: `ngrok http 3000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. In Clerk Dashboard → **Webhooks**:
   - Add Endpoint: `https://YOUR_NGROK_URL/api/webhook/clerk`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy the Signing Secret to `.env` as `CLERK_WEBHOOK_SECRET`

### 4. Run Migrations (30 seconds)
```bash
npm run db:migrate
```

### 5. Test It! (30 seconds)
```bash
npm run dev
```

Visit `http://localhost:3000` and:
1. Click "Get Started Free"
2. Sign up with an email
3. You'll be redirected to `/dashboard`
4. Check your database - user should be saved! ✅

---

## What's Working Now

✅ **Authentication Pages**
- `/sign-in` - Beautiful sign-in form
- `/sign-up` - User registration
- Both styled with dark theme

✅ **Database Integration**
- Users automatically saved to Neon database on signup
- Profile updates synced
- User deletion handled

✅ **Protected Routes**
- Dashboard at `/dashboard` shows user info
- All routes protected except homepage and auth pages

✅ **UI Components**
- Navbar shows UserButton when signed in
- Sign In/Up buttons when signed out

---

## Common Commands

```bash
# Start development server
npm run dev

# Generate database migrations
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema directly (development only)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

---

## Troubleshooting

**Problem**: "Missing environment variables"  
**Fix**: Make sure all 3 Clerk keys are in `.env`

**Problem**: Webhook not working  
**Fix**: 
- Ensure ngrok is running
- Webhook URL must be: `https://YOUR_NGROK_URL/api/webhook/clerk`
- Check webhook logs in Clerk Dashboard

**Problem**: User not in database after signup  
**Fix**: 
- Verify webhook is configured
- Check console for errors
- Ensure `CLERK_WEBHOOK_SECRET` is correct

---

## Next Steps

Once basic auth is working:

1. **Customize Dashboard** - Edit `app/dashboard/page.tsx`
2. **Add More Features** - Candidates, Jobs management
3. **Enable Social Login** - Google, GitHub in Clerk Dashboard
4. **Customize Emails** - Brand verification emails
5. **Deploy to Production** - Vercel + update Clerk URLs

---

## Need Help?

📖 Full documentation: `CLERK_SETUP.md`  
📋 Implementation details: `CLERK_IMPLEMENTATION_SUMMARY.md`  
🌐 Clerk docs: https://clerk.com/docs  

---

**You're all set!** 🎉 

Sign up a user and watch them appear in your database automatically!
