# Step-by-Step Setup Instructions

## Step 1: Get Supabase Database Connection Strings

You have:
- ✅ Project URL: https://ddsnpssvrlgmuitiisjt.supabase.co
- ✅ API Key (anon): eyJhbGci...

Now you need the DATABASE connection strings:

### Go to Supabase Dashboard:
1. Visit: https://supabase.com/dashboard/project/ddsnpssvrlgmuitiisjt
2. Click **Settings** (gear icon on left)
3. Click **Database** in the settings menu
4. Scroll down to **Connection string** section

### Copy BOTH connection strings:

**Connection pooling (Transaction mode):**
```
Connection string: URI
postgresql://postgres.ddsnpssvrlgmuitiisjt:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```
This is your `DATABASE_URL`

**Direct connection:**
```
Connection string: URI  
postgresql://postgres.ddsnpssvrlgmuitiisjt:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```
This is your `DIRECT_URL`

⚠️ **Important**: Replace `[YOUR-PASSWORD]` with your actual database password
(It's the password you set when creating the project)

---

## Step 2: Update Your Local .env File

Once you have the connection strings, update your `.env` file:

```bash
# Copy .env.example to .env if you haven't
cp .env.example .env

# Then edit .env and add:
DATABASE_URL="postgresql://postgres.ddsnpssvrlgmuitiisjt:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.ddsnpssvrlgmuitiisjt:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

INNGEST_EVENT_KEY="h4Hraz5CiQsJpj6La_8ISfdoHypE9hkszPBw-vcqCg0lxswNFeGDW2srBmqa_XyhCGtg-1q43xqHiA0QfhJX9g"
INNGEST_SIGNING_KEY="signkey-prod-088b4b584dda9e411a72f0d7b6d0a4b93dfe9badff7580451cd3112b5bcc274e"
```

---

## Step 3: Run Database Migrations

```bash
# Generate Prisma client for PostgreSQL
npx prisma generate

# Create the database tables
npx prisma migrate dev --name init_postgres

# You should see: "Your database is now in sync with your schema"
```

---

## Step 4: Push Code to GitHub

What's your GitHub repository URL? (e.g., https://github.com/yourusername/repo-name)

If you created it but haven't pushed yet:

```bash
# Initialize git if not done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Shopify tracking app"

# Add your GitHub repo as remote (replace with your actual URL)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 5: Make Repository Accessible to Vercel

### Option A: Public Repository (Easier)
1. Go to your GitHub repository
2. Click **Settings**
3. Scroll to bottom → **Change visibility**
4. Click **Change to public**

### Option B: Private Repository (Need to connect GitHub)
1. Go to Vercel: https://vercel.com/dashboard
2. Click your profile picture → **Settings**
3. Click **Git** in left sidebar
4. Click **Connect GitHub Account** or **Install GitHub App**
5. Authorize Vercel to access your repositories
6. Select which repositories to grant access to

---

## Step 6: Import to Vercel

1. Go to: https://vercel.com/new
2. You should now see your repository in the list
3. Click **Import** next to your repository
4. **Framework Preset**: Remix (should auto-detect)
5. **Root Directory**: `./`
6. **DON'T CLICK DEPLOY YET**
7. Click **Environment Variables** to add them first

---

## Step 7: Add Environment Variables in Vercel

Click "Add" for each variable:

```
SHOPIFY_API_KEY = (from Shopify Partners Dashboard - get in next step)
SHOPIFY_API_SECRET = (from Shopify Partners Dashboard - get in next step)
SHOPIFY_SCOPES = read_orders,write_orders,read_fulfillments,write_fulfillments

SEVENTEEN_TRACK_API_KEY = (get from 17TRACK dashboard)

DATABASE_URL = postgresql://postgres.ddsnpssvrlgmuitiisjt:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
DIRECT_URL = postgresql://postgres.ddsnpssvrlgmuitiisjt:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

INNGEST_EVENT_KEY = h4Hraz5CiQsJpj6La_8ISfdoHypE9hkszPBw-vcqCg0lxswNFeGDW2srBmqa_XyhCGtg-1q43xqHiA0QfhJX9g
INNGEST_SIGNING_KEY = signkey-prod-088b4b584dda9e411a72f0d7b6d0a4b93dfe9badff7580451cd3112b5bcc274e

SESSION_SECRET = (generate with: openssl rand -base64 32)
ENCRYPTION_KEY = (generate with: openssl rand -base64 32)

APP_URL = https://your-project.vercel.app
NODE_ENV = production
```

⚠️ For `APP_URL`, use a placeholder first, we'll update it after deployment

---

## Step 8: Generate Secure Keys

In your terminal, run:

```bash
# Generate SESSION_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY  
openssl rand -base64 32
```

Copy these values and add them to Vercel environment variables.

---

## Step 9: Deploy!

1. Click **Deploy** in Vercel
2. Wait ~2 minutes for build
3. You'll get a URL like: `https://your-project-abc123.vercel.app`
4. **COPY THIS URL**

---

## Step 10: Update APP_URL

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Find `APP_URL`
3. Click **Edit**
4. Change to your actual Vercel URL (e.g., `https://your-project-abc123.vercel.app`)
5. Save
6. Go to **Deployments** tab
7. Click the 3 dots on latest deployment → **Redeploy**

---

## Step 11: Get Shopify Credentials

1. Go to: https://partners.shopify.com/
2. Click **Apps** in left sidebar
3. Click **Create app** (or select existing app)
4. Enter app name: "Dropship Tracking" (or your preferred name)
5. Click **Create app**

### Configure App Settings:

**App URL:**
```
https://your-project-abc123.vercel.app
```

**Allowed redirection URL(s):**
```
https://your-project-abc123.vercel.app/auth/callback
```

**App proxy:**
- Subpath prefix: `apps`
- Subpath: `track`
- Proxy URL: `https://your-project-abc123.vercel.app/apps`

**API scopes:**
- ☑️ read_orders
- ☑️ write_orders
- ☑️ read_fulfillments
- ☑️ write_fulfillments

### Get Credentials:

Scroll to **Client credentials** section:
- Copy **Client ID** → This is your `SHOPIFY_API_KEY`
- Copy **Client secret** → This is your `SHOPIFY_API_SECRET`

### Update Vercel:

1. Go to Vercel → Settings → Environment Variables
2. Edit `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
3. Add the values you just copied
4. Redeploy

---

## Step 12: Configure Inngest Webhook

1. Go to: https://www.inngest.com/
2. Go to your app dashboard
3. Find **Serve API** or **Event Keys** section
4. Add serve endpoint:
   ```
   https://your-project-abc123.vercel.app/api/inngest
   ```

---

## Step 13: Get 17TRACK API Key (if you don't have it)

1. Go to: https://www.17track.net/en/api
2. Sign up / Login
3. Get your API key from dashboard
4. Add webhook URL:
   ```
   https://your-project-abc123.vercel.app/webhooks/17track
   ```
5. Copy API key
6. Add to Vercel environment variables as `SEVENTEEN_TRACK_API_KEY`
7. Redeploy

---

## Step 14: Test Installation!

### Create Development Store:

1. In Shopify Partners → **Stores**
2. Click **Add store** → **Development store**
3. Fill in details, click **Save**
4. Copy store name (e.g., `my-dev-store.myshopify.com`)

### Install Your App:

Visit this URL (replace with your values):
```
https://your-project-abc123.vercel.app/auth/shopify?shop=my-dev-store.myshopify.com
```

Click **Install app**

---

## Troubleshooting

### Can't see GitHub repository in Vercel?

**Solution 1: Make repo public**
1. GitHub → Your Repo → Settings
2. Scroll to bottom → "Change to public"

**Solution 2: Connect GitHub to Vercel**
1. Vercel → Settings → Git
2. Connect GitHub account
3. Authorize Vercel

### Build fails in Vercel?

Check the error message. Common issues:
- Missing environment variables
- Database connection fails → Check DATABASE_URL

### OAuth fails?

- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` match Shopify dashboard
- Verify `APP_URL` matches your Vercel URL exactly
- Check redirect URL is configured in Shopify

---

## Quick Checklist

- [ ] Got DATABASE_URL from Supabase
- [ ] Got DIRECT_URL from Supabase
- [ ] Updated local .env
- [ ] Ran `npx prisma migrate dev`
- [ ] Pushed code to GitHub
- [ ] Made repository accessible to Vercel
- [ ] Imported to Vercel
- [ ] Added all environment variables
- [ ] Deployed successfully
- [ ] Updated APP_URL with real Vercel URL
- [ ] Redeployed
- [ ] Configured Shopify app with Vercel URL
- [ ] Got Shopify credentials
- [ ] Updated Vercel with Shopify credentials
- [ ] Configured Inngest webhook
- [ ] Tested installation on dev store

---

**Current Status:**
- ✅ Supabase project created
- ✅ Inngest keys ready
- ✅ GitHub repository created
- ⏳ Need to get database connection strings
- ⏳ Need to push code to GitHub
- ⏳ Need to connect to Vercel

**What to do right now:**
1. Get Supabase DATABASE_URL and DIRECT_URL (see Step 1 above)
2. Tell me your GitHub repository URL
3. Generate SESSION_SECRET and ENCRYPTION_KEY
4. Then we continue with deployment!
