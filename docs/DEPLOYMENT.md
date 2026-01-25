# Deployment Guide - Portfolio Website

> **Last Updated:** January 2026
> **Purpose:** Step-by-step instructions for testing, deploying, and maintaining the portfolio website

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Testing Locally](#testing-locally)
3. [Preparing for Deployment](#preparing-for-deployment)
4. [Deploying via CDK](#deploying-via-cdk)
5. [Deploying via GitHub Actions](#deploying-via-github-actions)
6. [Cache Invalidation](#cache-invalidation)
7. [Verification](#verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Manual File Uploads](#manual-file-uploads)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

**Local Development:**
- ✅ Web browser (Chrome, Firefox, Safari, etc.)
- ✅ Simple HTTP server (Python, Node.js, or VS Code Live Server)
- ✅ Text editor or IDE

**CDK Deployment:**
- ✅ AWS CLI installed and configured (`aws --version`)
- ✅ AWS credentials configured (`aws configure` or environment variables)
- ✅ Node.js 18+ installed (`node --version`)
- ✅ npm installed (`npm --version`)
- ✅ AWS CDK CLI installed globally (`npm install -g aws-cdk`)

**GitHub Actions Deployment:**
- ✅ Push access to the GitHub repository
- ✅ GitHub Actions enabled on the repository
- ✅ Secrets configured (AWS_IAM_ROLE_ARN, AWS_REGION, CF_DISTRIBUTION_ID)

---

## Testing Locally

### Option 1: Python HTTP Server (Easiest)

```bash
cd /Users/sarahtime/Dev/resume-website/resume-website-files

# Python 3
python3 -m http.server 8000

# Open browser to:
# http://localhost:8000
```

### Option 2: Node.js HTTP Server

```bash
cd /Users/sarahtime/Dev/resume-website/resume-website-files

# Install http-server globally (one-time)
npm install -g http-server

# Start server
http-server -p 8000

# Open browser to:
# http://localhost:8000
```

### Option 3: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Open `resume-website-files/index.html`
3. Right-click → "Open with Live Server"
4. Browser opens automatically at `http://127.0.0.1:5500`

### What to Test

**Visual Inspection:**
- ✅ Header displays correctly with name and title
- ✅ Navigation tabs work (Experience, Technical Skills, Education, Projects)
- ✅ All sections display properly
- ✅ Social links work (LinkedIn, GitHub, Email)
- ✅ Download Resume button appears
- ✅ Footer displays correctly

**Responsive Design:**
- ✅ Open browser DevTools (F12)
- ✅ Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
- ✅ Test mobile view (375px width)
- ✅ Test tablet view (768px width)
- ✅ Test desktop view (1200px+ width)

**Color Scheme:**
- ✅ Navy blue (#2B547E) for headers
- ✅ Off-white background (#F8F9FA)
- ✅ Libre Bodoni font for name (small caps)

**Functionality:**
- ✅ Click each nav link - section should change
- ✅ Click "View Credential" button - opens AWS verification page
- ✅ Click GitHub project link - opens repository
- ✅ Hover over cards - should have lift effect
- ✅ No JavaScript errors in browser console

---

## Preparing for Deployment

### 1. File Organization Checklist

**Required Files:**
```
resume-website-files/
├── index.html          ✅ Updated with new content
├── styles.css          ✅ Updated with new design
├── script.js           ✅ Updated JavaScript
├── images/
│   └── headshot.JPG    ✅ Current professional photo
└── resume/
    └── Sarah_Wadley_Resume.pdf  ⚠️ YOU MUST ADD THIS
```

**Important:** Create the `resume/` directory and add your PDF:

```bash
cd /Users/sarahtime/Dev/resume-website/resume-website-files
mkdir -p resume
# Copy your resume PDF into this folder and name it exactly:
# Sarah_Wadley_Resume.pdf
```

### 2. Content Verification

**Double-check all content:**
- ✅ Work experience dates are correct
- ✅ Email address is correct (sarah_wadley@outlook.com)
- ✅ LinkedIn URL is correct (https://www.linkedin.com/in/sarah-wadley/)
- ✅ GitHub URL is correct (https://github.com/lifeunsubscribe)
- ✅ No typos or placeholder text
- ✅ All links open in new tabs where appropriate

### 3. Git Status Check

```bash
cd /Users/sarahtime/Dev/resume-website

# Check what files changed
git status

# Review changes before committing
git diff resume-website-files/index.html
git diff resume-website-files/styles.css
git diff resume-website-files/script.js
```

---

## Deploying via CDK

### When to Use CDK Deployment

Use CDK deployment when:
- 🔧 **Infrastructure changes** (modifying CloudFront, S3, certificates, etc.)
- 🆕 **Initial deployment** (first time setting up the website)
- 🔄 **Major updates** (adding new AWS resources)
- 📁 **Binary file updates** (new headshot image, fonts, etc.)

### CDK Deployment Steps

**1. Navigate to CDK directory:**

```bash
cd /Users/sarahtime/Dev/resume-website/resume-website-cdk
```

**2. Install dependencies (if not already done):**

```bash
npm install
```

**3. Compile TypeScript:**

```bash
npm run build

# Or watch mode (auto-compiles on save):
# npm run watch
```

**4. Review changes before deploying:**

```bash
cdk diff

# This shows what will change in AWS
# Review carefully before proceeding
```

**5. Deploy to AWS:**

```bash
# Deploy both stacks
cdk deploy --all

# Or deploy specific stack:
# cdk deploy ResumeWebsiteCdkStack
# cdk deploy GitHubActionsRoleStack
```

**6. Confirm deployment:**

CDK will show you a summary of changes and ask:
```
Do you wish to deploy these changes (y/n)?
```

Type `y` and press Enter.

**7. Wait for deployment:**

Deployment typically takes:
- **First deployment:** 15-20 minutes (CloudFront distribution creation)
- **Subsequent deployments:** 5-10 minutes (updates only)

**8. Note the outputs:**

CDK will output important values:
```
Outputs:
ResumeWebsiteCdkStack.DistributionDomainName = d1234abcd.cloudfront.net
ResumeWebsiteCdkStack.WebsiteURL = https://www.cloudwithsarah.com
```

### CDK Deployment Output

**What happens during deployment:**

1. ✅ Uploads website files to S3 bucket
2. ✅ Creates/updates CloudFront distribution
3. ✅ Configures Route53 DNS records
4. ✅ Attaches/updates ACM certificate
5. ✅ Invalidates CloudFront cache
6. ✅ Updates IAM policies if needed

**Typical console output:**
```
ResumeWebsiteCdkStack: deploying...
[0%] start: Publishing asset...
[50%] success: Published asset...
[100%] success: Published
ResumeWebsiteCdkStack: creating CloudFormation changeset...

✅ ResumeWebsiteCdkStack

Stack ARN:
arn:aws:cloudformation:us-east-1:342587863995:stack/ResumeWebsiteCdkStack/...
```

---

## Deploying via GitHub Actions

### When to Use GitHub Actions

Use GitHub Actions deployment when:
- 📝 **Content updates only** (HTML, CSS, JavaScript changes)
- 🚀 **Quick deployments** (no infrastructure changes)
- 🔄 **Frequent updates** (daily/weekly content tweaks)
- ⏱️ **Fastest method** (30-60 seconds)

**Note:** GitHub Actions **does NOT deploy binary files** (images) by default. Use CDK for those.

### GitHub Actions Deployment Steps

**1. Commit your changes:**

```bash
cd /Users/sarahtime/Dev/resume-website

# Add all changed files
git add resume-website-files/

# Or add specific files:
# git add resume-website-files/index.html
# git add resume-website-files/styles.css
# git add resume-website-files/script.js
# git add resume-website-files/resume/

# Check what will be committed
git status

# Commit with descriptive message
git commit -m "Update portfolio content and design

- Updated work experience with Westgate and L3Harris roles
- Added Technical Skills section
- Redesigned with navy blue color scheme
- Implemented Libre Bodoni typography
- Added download resume button
- Improved mobile responsiveness"
```

**2. Push to main branch:**

```bash
git push origin main
```

**3. Monitor deployment:**

GitHub Actions will automatically trigger. Monitor progress:

**Option A: GitHub Web UI**
1. Go to https://github.com/lifeunsubscribe/resume-website
2. Click "Actions" tab
3. Click the latest workflow run
4. Watch real-time logs

**Option B: GitHub CLI**
```bash
# Install GitHub CLI if not already installed
brew install gh

# Authenticate
gh auth login

# Watch workflow
gh run watch
```

**4. Deployment stages:**

The workflow runs these steps:
```
1. Checkout code                    ✅ 10 seconds
2. Configure AWS credentials (OIDC) ✅ 5 seconds
3. Sync files to S3                 ✅ 15-30 seconds
4. Invalidate CloudFront cache      ✅ 5 seconds
   Total: ~30-60 seconds
```

**5. Check for errors:**

If the workflow fails:
- ❌ Red "X" in GitHub Actions
- 📧 Email notification (if enabled)
- Check logs for specific error

Common errors:
- **Authentication failed:** OIDC trust policy issue
- **Access denied:** IAM permissions issue
- **Sync failed:** File path issue

---

## Cache Invalidation

### Why Cache Invalidation?

CloudFront caches content at edge locations worldwide for fast delivery. After updating files, you must invalidate the cache to show new content immediately.

### Automatic Invalidation

Both deployment methods automatically invalidate cache:
- ✅ **CDK:** BucketDeployment construct invalidates after upload
- ✅ **GitHub Actions:** Workflow runs `aws cloudfront create-invalidation`

### Manual Cache Invalidation

If changes don't appear, manually invalidate:

**AWS CLI:**
```bash
aws cloudfront create-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --paths "/*"
```

**AWS Console:**
1. Go to https://console.aws.amazon.com/cloudfront
2. Click distribution `EG3WGB7ERFXYG`
3. Click "Invalidations" tab
4. Click "Create invalidation"
5. Enter paths: `/*`
6. Click "Create invalidation"

**Check invalidation status:**
```bash
aws cloudfront get-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --id <INVALIDATION_ID>
```

**Invalidation propagation time:**
- Typical: 30-60 seconds
- Worldwide: 2-3 minutes

### Selective Invalidation (Cost Optimization)

Instead of invalidating everything (`/*`), invalidate specific files:

```bash
# Invalidate only HTML and CSS
aws cloudfront create-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --paths "/index.html" "/styles.css"
```

**Pricing:**
- First 1,000 invalidation paths per month: FREE
- Additional paths: $0.005 per path

---

## Verification

### Step-by-Step Verification Checklist

**1. Wait for propagation:**
- CDK deployment: Wait 2-3 minutes after "Deploy complete"
- GitHub Actions: Wait 1-2 minutes after workflow completes

**2. Clear browser cache:**
```
Chrome/Edge: Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)
Firefox: Ctrl+Shift+Delete
Safari: Cmd+Option+E
```

**3. Hard refresh the page:**
```
Chrome/Edge/Firefox: Ctrl+F5 (Windows) / Cmd+Shift+R (Mac)
Safari: Cmd+Option+R
```

**4. Open the live site:**
```
https://www.cloudwithsarah.com
```

**5. Verify content:**
- ✅ New work experience shows (Westgate, L3Harris)
- ✅ Technical Skills section exists
- ✅ Navy blue color scheme (#2B547E)
- ✅ Libre Bodoni font for name
- ✅ No bouncy animation on name
- ✅ Download Resume button works
- ✅ Footer has "Let's Connect" section
- ✅ All social links work

**6. Test download button:**
- Click "Download Resume" in footer
- PDF should download (if you uploaded it)
- If 404 error, you need to upload the PDF file

**7. Test mobile responsiveness:**
- Open DevTools (F12)
- Toggle device toolbar
- Test different screen sizes
- Navigation should adapt
- Cards should stack vertically

**8. Check browser console:**
```
F12 → Console tab
Should have NO red errors
```

**9. Test all links:**
- LinkedIn → Opens profile in new tab
- GitHub → Opens repository in new tab
- Email → Opens email client
- View Credential → Opens AWS verification page
- GitHub project link → Opens repository

**10. Test SEO meta tags:**
```
Right-click page → View Page Source
Check <head> section for:
- <meta name="description" content="Sarah Wadley - Software Engineer...">
- <meta property="og:title" content="Sarah Wadley | Software Engineer">
- <title>Sarah Wadley | Software Engineer & Cloud Architect</title>
```

### Verification via AWS Console

**Check S3 bucket:**
```bash
aws s3 ls s3://www.cloudwithsarah.com/

# You should see:
# index.html
# styles.css
# script.js
# images/
# resume/ (if uploaded)
```

**Check CloudFront distribution:**
```bash
aws cloudfront get-distribution --id EG3WGB7ERFXYG

# Look for:
# Status: "Deployed"
# Enabled: true
# DomainName: www.cloudwithsarah.com
```

**Check Route53 DNS:**
```bash
dig www.cloudwithsarah.com

# Should resolve to CloudFront distribution
```

---

## Rollback Procedures

### Scenario 1: Bad Content Deployment (GitHub Actions)

If you deployed bad content via GitHub Actions:

**Option A: Revert Git Commit**
```bash
cd /Users/sarahtime/Dev/resume-website

# Find the last good commit
git log --oneline

# Revert to previous commit
git revert HEAD

# Or reset to specific commit (WARNING: destructive)
# git reset --hard <COMMIT_SHA>

# Push to trigger redeployment
git push origin main
```

**Option B: Manually Restore Files**
```bash
# Restore specific file from previous commit
git checkout HEAD~1 -- resume-website-files/index.html

# Commit and push
git add .
git commit -m "Rollback index.html to previous version"
git push origin main
```

### Scenario 2: Bad Infrastructure Deployment (CDK)

If you deployed breaking infrastructure changes:

**Option A: Revert CDK Code**
```bash
cd /Users/sarahtime/Dev/resume-website/resume-website-cdk

# Revert Git commit
git revert HEAD

# Redeploy
npm run build
cdk deploy --all
```

**Option B: CloudFormation Rollback**
```bash
# List CloudFormation stacks
aws cloudformation list-stacks

# Rollback to previous version
aws cloudformation cancel-update-stack \
  --stack-name ResumeWebsiteCdkStack
```

**Option C: Restore from CloudFormation Console**
1. Go to https://console.aws.amazon.com/cloudformation
2. Select `ResumeWebsiteCdkStack`
3. Click "Stack actions" → "Roll back"
4. Confirm rollback

### Scenario 3: Accidental S3 File Deletion

If you accidentally deleted files from S3:

**Option A: Redeploy via CDK**
```bash
cd /Users/sarahtime/Dev/resume-website/resume-website-cdk
cdk deploy ResumeWebsiteCdkStack

# BucketDeployment will restore all files
```

**Option B: Manual Upload**
```bash
aws s3 sync \
  /Users/sarahtime/Dev/resume-website/resume-website-files \
  s3://www.cloudwithsarah.com \
  --delete
```

**Option C: Restore from S3 Versioning (if enabled)**
```bash
# Note: Versioning is NOT enabled by default in this stack
# To enable, update CDK stack with:
# versioned: true
```

### Scenario 4: Complete Website Outage

If the website is completely down:

**1. Check CloudFront status:**
```bash
aws cloudfront get-distribution --id EG3WGB7ERFXYG | grep Status
```

**2. Check S3 bucket exists:**
```bash
aws s3 ls www.cloudwithsarah.com
```

**3. Check Route53 DNS:**
```bash
dig www.cloudwithsarah.com
```

**4. Emergency restore:**
```bash
cd /Users/sarahtime/Dev/resume-website/resume-website-cdk

# Destroy and recreate (LAST RESORT)
cdk destroy --all
cdk deploy --all
```

**Downtime:** 15-20 minutes for full stack recreation

---

## Manual File Uploads

### When to Upload Files Manually

- 📄 **Resume PDF** - After creating resume/ folder
- 🖼️ **New headshot** - After updating images/
- 🔤 **New fonts** - After adding to fonts/ folder
- 📦 **Large binary files** - Not synced by GitHub Actions

### Upload Resume PDF

**Create folder and upload:**
```bash
cd /Users/sarahtime/Dev/resume-website/resume-website-files

# Create folder
mkdir -p resume

# Copy your resume PDF (rename if needed)
cp ~/Downloads/My_Resume.pdf resume/Sarah_Wadley_Resume.pdf

# Upload to S3
aws s3 cp resume/Sarah_Wadley_Resume.pdf \
  s3://www.cloudwithsarah.com/resume/Sarah_Wadley_Resume.pdf

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --paths "/resume/*"
```

### Upload New Headshot

**Replace headshot image:**
```bash
cd /Users/sarahtime/Dev/resume-website/resume-website-files

# Backup old headshot
cp images/headshot.JPG images/headshot_old.JPG

# Copy new headshot
cp ~/Desktop/new_headshot.jpg images/headshot.JPG

# Upload to S3
aws s3 cp images/headshot.JPG \
  s3://www.cloudwithsarah.com/images/headshot.JPG

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --paths "/images/headshot.JPG"
```

### Upload All Files

**Sync entire directory:**
```bash
cd /Users/saarhtime/Dev/resume-website

# Sync all files
aws s3 sync resume-website-files/ s3://www.cloudwithsarah.com/ \
  --delete

# Invalidate all cache
aws cloudfront create-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --paths "/*"
```

**Warning:** `--delete` flag removes files from S3 that don't exist locally. Omit if unsure.

---

## Troubleshooting

### Problem: Changes Don't Appear on Live Site

**Possible causes:**
1. CloudFront cache not invalidated
2. Browser cache not cleared
3. DNS cache on local machine

**Solutions:**
```bash
# 1. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --paths "/*"

# 2. Clear browser cache (Ctrl+Shift+Delete)

# 3. Hard refresh (Ctrl+F5 / Cmd+Shift+R)

# 4. Flush DNS cache (macOS)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# 4. Flush DNS cache (Windows)
ipconfig /flushdns
```

### Problem: Download Resume Button Returns 404

**Cause:** Resume PDF not uploaded to S3

**Solution:**
```bash
# Check if resume folder exists in S3
aws s3 ls s3://www.cloudwithsarah.com/resume/

# If empty, upload resume
aws s3 cp resume-website-files/resume/Sarah_Wadley_Resume.pdf \
  s3://www.cloudwithsarah.com/resume/Sarah_Wadley_Resume.pdf
```

### Problem: GitHub Actions Deployment Fails

**Error:** `An error occurred (AccessDenied) when calling the AssumeRoleWithWebIdentity operation`

**Cause:** OIDC trust policy doesn't allow repository

**Solution:**
```bash
cd resume-website-cdk

# Check GitHubActionsRoleStack trust policy
# Verify repository name matches: lifeunsubscribe/resume-website

# If incorrect, update lib/github-actions-role-stack.ts
# Then redeploy:
npm run build
cdk deploy GitHubActionsRoleStack
```

### Problem: CSS/JS Not Loading

**Error in browser console:** `Failed to load resource: net::ERR_FILE_NOT_FOUND`

**Cause:** Files not uploaded to S3 or wrong paths

**Solution:**
```bash
# Check files exist in S3
aws s3 ls s3://www.cloudwithsarah.com/

# If missing, upload
aws s3 cp resume-website-files/styles.css s3://www.cloudwithsarah.com/
aws s3 cp resume-website-files/script.js s3://www.cloudwithsarah.com/

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --paths "/styles.css" "/script.js"
```

### Problem: Certificate Validation Stuck

**Symptom:** CDK deployment hangs at certificate creation

**Cause:** DNS validation CNAME not created

**Solution:**
```bash
# Check Route53 for validation CNAME
aws route53 list-resource-record-sets \
  --hosted-zone-id Z0935238159PZ4YC8L3ZJ | grep _

# If missing, delete and recreate certificate:
# 1. Delete certificate in ACM console
# 2. Rerun cdk deploy
```

### Problem: Website Shows Old Content

**Cause:** Browser or CloudFront cache

**Solution:**
```bash
# 1. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --paths "/*"

# 2. Open incognito/private browsing window

# 3. Test from different device/network

# 4. Check S3 file timestamps
aws s3api head-object \
  --bucket www.cloudwithsarah.com \
  --key index.html
```

---

## Post-Deployment Checklist

After every deployment, verify:

- [ ] Website loads at https://www.cloudwithsarah.com
- [ ] HTTPS certificate is valid (green padlock in browser)
- [ ] All navigation links work
- [ ] Social links open correctly
- [ ] Download Resume button works (if resume uploaded)
- [ ] Mobile view displays correctly
- [ ] No JavaScript errors in console
- [ ] Page loads in under 2 seconds (test with fast 3G throttling)
- [ ] SEO meta tags are correct (view page source)
- [ ] Contact links work (LinkedIn, GitHub, Email)

---

## Quick Reference Commands

**Test locally:**
```bash
cd resume-website-files && python3 -m http.server 8000
```

**Deploy via GitHub Actions:**
```bash
git add . && git commit -m "Update content" && git push origin main
```

**Deploy via CDK:**
```bash
cd resume-website-cdk && npm run build && cdk deploy --all
```

**Invalidate cache:**
```bash
aws cloudfront create-invalidation --distribution-id EG3WGB7ERFXYG --paths "/*"
```

**Upload resume:**
```bash
aws s3 cp resume-website-files/resume/Sarah_Wadley_Resume.pdf s3://www.cloudwithsarah.com/resume/
```

**Check deployment status:**
```bash
gh run watch  # GitHub Actions
aws cloudformation describe-stacks --stack-name ResumeWebsiteCdkStack  # CDK
```

---

## Files You Need to Add Manually

Before deploying, ensure these files exist:

**Required:**
- ✅ `resume-website-files/resume/Sarah_Wadley_Resume.pdf` - Your resume PDF

**Optional (already present):**
- ✅ `resume-website-files/images/headshot.JPG` - Professional headshot
- ✅ All HTML/CSS/JS files (already updated)

---

## Estimated Deployment Times

| Method | Time | Use Case |
|--------|------|----------|
| **Local Testing** | Instant | Preview changes before deploying |
| **GitHub Actions** | 30-60 sec | Content updates (HTML/CSS/JS) |
| **CDK (update)** | 5-10 min | Infrastructure + content changes |
| **CDK (initial)** | 15-20 min | First-time setup |
| **Cache Invalidation** | 30-60 sec | Force fresh content globally |

---

## Support & Resources

**AWS Documentation:**
- [CloudFront Cache Invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
- [CDK Deployment Guide](https://docs.aws.amazon.com/cdk/v2/guide/deploy.html)
- [S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)

**GitHub Actions:**
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [AWS OIDC Integration](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

**Troubleshooting:**
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical information
- Review AWS CloudWatch logs for errors
- Check GitHub Actions run logs for deployment failures

---

**Last Updated:** January 2026
**Maintainer:** Sarah Wadley
**Questions?** Review this guide, check logs, or consult the [Architecture Documentation](ARCHITECTURE.md).
