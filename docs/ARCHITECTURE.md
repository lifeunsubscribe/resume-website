# Portfolio Website - Architecture Documentation

> **Last Updated:** January 2026
> **Author:** Sarah Wadley
> **Purpose:** Technical deep dive into infrastructure, security, and deployment architecture

---

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure Architecture](#infrastructure-architecture)
3. [CDK Stack Deep Dive](#cdk-stack-deep-dive)
4. [Security Model](#security-model)
5. [Deployment Flow](#deployment-flow)
6. [File Structure & Dependencies](#file-structure--dependencies)
7. [Architectural Decisions](#architectural-decisions)
8. [What Would Break If...](#what-would-break-if)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This is a **production-grade serverless portfolio website** using AWS CDK with Infrastructure as Code (IaC). The architecture follows AWS best practices for security, scalability, and cost optimization.

### Tech Stack
- **Frontend:** Static HTML/CSS/JavaScript
- **Infrastructure:** AWS CDK 2.x (TypeScript)
- **Hosting:** S3 + CloudFront CDN
- **DNS:** Route53 with ACM SSL certificate
- **CI/CD:** GitHub Actions with OIDC authentication
- **Region:** us-east-1 (certificates must be in this region for CloudFront)

### AWS Account
- **Account ID:** 342587863995
- **Primary Region:** us-east-1

---

## Infrastructure Architecture

### High-Level Flow

```
User Request (https://www.cloudwithsarah.com)
    ↓
Route53 DNS (A record → CloudFront)
    ↓
CloudFront Distribution (Global CDN)
├── Checks cache at edge location
├── If cached: Returns immediately
└── If not cached:
    ↓
    CloudFront signs request with OAC (SigV4)
    ↓
    Private S3 Bucket validates signature
    ↓
    Returns content to CloudFront
    ↓
    CloudFront caches and serves to user
```

### AWS Resources Created

**Two CloudFormation Stacks:**

1. **ResumeWebsiteCdkStack** - Main hosting infrastructure
2. **GitHubActionsRoleStack** - CI/CD permissions

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USERS / BROWSERS                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS Request
                         ↓
        ┌────────────────────────────────┐
        │      Route53 DNS                │
        │  cloudwithsarah.com             │
        │  www.cloudwithsarah.com         │ (A records → CloudFront)
        └────────────────┬────────────────┘
                         │
                         ↓
    ┌────────────────────────────────────────┐
    │    CloudFront Distribution              │
    │    (Global CDN / Edge Caching)          │
    │    - HTTPS/TLS via ACM Certificate      │
    │    - Default Root Object: index.html    │
    │    - Origin Access Control (OAC)        │
    │    - SigV4 Signed Requests              │
    └────────────┬───────────────────────────┘
                 │ Cryptographically signed request
                 ↓
    ┌────────────────────────────────────┐
    │  S3 Private Bucket                 │
    │  www.cloudwithsarah.com            │
    │  - BlockPublicAccess: ENABLED      │
    │  - Enforce SSL: YES                │
    │  - Bucket Policy: CloudFront only  │
    │  - Contents:                       │
    │    • index.html                    │
    │    • styles.css                    │
    │    • script.js                     │
    │    • fonts/                        │
    │    • images/                       │
    └────────────────────────────────────┘


CI/CD PIPELINE:
┌──────────────────────────────────────┐
│  Developer (git push to main)        │
└────────────┬─────────────────────────┘
             │
             ↓
┌──────────────────────────────────────┐
│  GitHub Actions (deploy.yml)         │
│  1. Checkout code                    │
│  2. Configure AWS Credentials (OIDC) │
│  3. Assume GitHubActionsRole         │
│  4. S3 Sync (HTML/CSS/JS only)       │
│  5. CloudFront Cache Invalidation    │
└────────────┬─────────────────────────┘
             │
             ↓
    Live Website Updated! (30-60 sec)
```

---

## CDK Stack Deep Dive

### Stack 1: ResumeWebsiteCdkStack

**Location:** `resume-website-cdk/lib/resume-website-cdk-stack.ts`

#### Resources Created:

#### 1. S3 Buckets (2)

**Primary Bucket:** `www.cloudwithsarah.com`
```typescript
const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
  bucketName: 'www.cloudwithsarah.com',
  websiteIndexDocument: 'index.html',
  websiteErrorDocument: 'index.html',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,  // Fully private
  enforceSSL: true,                                     // Reject HTTP
  removalPolicy: cdk.RemovalPolicy.DESTROY,            // Dev convenience
  autoDeleteObjects: true,                             // Clean stack deletion
});
```

**Key Features:**
- **Private:** No public internet access allowed
- **SSL Enforced:** Rejects any non-HTTPS requests
- **Website Mode:** Configured for static website hosting
- **Auto-cleanup:** Destroys objects on stack deletion (dev environment)

**Redirect Bucket:** `cloudwithsarah.com`
```typescript
const redirectBucket = new s3.Bucket(this, 'RedirectBucket', {
  bucketName: 'cloudwithsarah.com',
  websiteRedirect: {
    hostName: 'www.cloudwithsarah.com',
    protocol: s3.RedirectProtocol.HTTPS,
  },
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});
```

**Purpose:** Redirects `cloudwithsarah.com` → `www.cloudwithsarah.com` over HTTPS

#### 2. Origin Access Control (OAC)

```typescript
const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
  originAccessControlConfig: {
    name: 'StaticSiteOAC',
    originAccessControlOriginType: 's3',
    signingBehavior: 'always',      // Sign every request
    signingProtocol: 'sigv4',       // AWS Signature Version 4
  },
});
```

**What this does:**
- Creates a cryptographic signing mechanism
- CloudFront signs every request to S3 using AWS SigV4
- S3 validates the signature before returning content
- Modern replacement for Origin Access Identity (OAI)

#### 3. CloudFront Distribution

```typescript
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(websiteBucket, {
      originAccessControlId: oac.attrId,  // Uses OAC
    }),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  domainNames: ['cloudwithsarah.com', 'www.cloudwithsarah.com'],
  certificate: cert,                      // ACM certificate
  defaultRootObject: 'index.html',
});
```

**Key Configuration:**
- **Global CDN:** Content cached at 400+ edge locations worldwide
- **HTTPS Only:** Redirects HTTP → HTTPS automatically
- **Custom Domains:** Serves both root and www domains
- **Default Document:** Serves `index.html` for root requests
- **Origin:** Private S3 bucket accessed via OAC

#### 4. S3 Bucket Policy

```typescript
websiteBucket.addToResourcePolicy(new iam.PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [websiteBucket.arnForObjects('*')],
  principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
  conditions: {
    'StringEquals': {
      'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`
    }
  }
}));
```

**What this policy does:**
- Allows `cloudfront.amazonaws.com` service to read objects
- **BUT ONLY** from distribution ID `EG3WGB7ERFXYG`
- No other principals can access the bucket (not even AWS Console)
- Requires matching source ARN to prevent confused deputy attacks

#### 5. ACM Certificate

```typescript
const cert = new acm.Certificate(this, 'Certificate', {
  domainName: 'cloudwithsarah.com',
  subjectAlternativeNames: ['www.cloudwithsarah.com'],
  validation: acm.CertificateValidation.fromDns(hostedZone),
});
```

**Automatic DNS Validation:**
1. ACM generates a validation CNAME record
2. CDK automatically creates the CNAME in Route53
3. ACM validates domain ownership
4. Certificate issued (usually within 5 minutes)
5. Auto-renews before expiry using the same CNAME

**Region Note:** Certificate **must** be in `us-east-1` for CloudFront (global service requirement)

#### 6. Route53 DNS Records

```typescript
const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
  domainName: 'cloudwithsarah.com',
});

new route53.ARecord(this, 'AliasRecord', {
  zone: hostedZone,
  recordName: 'cloudwithsarah.com',
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution)
  ),
});

new route53.ARecord(this, 'WWWAliasRecord', {
  zone: hostedZone,
  recordName: 'www.cloudwithsarah.com',
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution)
  ),
});
```

**Two A records:**
- `cloudwithsarah.com` → CloudFront distribution
- `www.cloudwithsarah.com` → CloudFront distribution

**Why Alias records?**
- No additional DNS query charges
- Automatic health checks
- Faster DNS resolution
- No TTL management needed

#### 7. S3 Bucket Deployment

```typescript
new s3deploy.BucketDeployment(this, 'DeployWebsite', {
  sources: [s3deploy.Source.asset('../resume-website-files')],
  destinationBucket: websiteBucket,
  distribution: distribution,
  distributionPaths: ['/*'],  // Invalidate all cached content
});
```

**What this does during `cdk deploy`:**
1. Zips contents of `../resume-website-files/`
2. Uploads to temporary S3 bucket
3. Lambda function extracts and copies to destination bucket
4. Invalidates CloudFront cache
5. Cleans up temporary resources

**Note:** This only runs during CDK deployment. Daily updates use GitHub Actions instead.

---

### Stack 2: GitHubActionsRoleStack

**Location:** `resume-website-cdk/lib/github-actions-role-stack.ts`

#### Resources Created:

#### 1. OIDC Provider

```typescript
const provider = new iam.OpenIdConnectProvider(this, 'GitHubOIDC', {
  url: 'https://token.actions.githubusercontent.com',
  clientIds: ['sts.amazonaws.com'],
  thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
});
```

**Purpose:** Enables GitHub Actions to authenticate with AWS using temporary tokens

**How it works:**
1. GitHub Actions requests a token from `token.actions.githubusercontent.com`
2. Token includes repository, branch, and workflow metadata
3. AWS OIDC provider validates the token
4. If valid, allows assuming the IAM role
5. GitHub gets temporary AWS credentials (15-60 min expiry)

**No secrets needed!** No AWS access keys stored in GitHub.

#### 2. IAM Role for GitHub Actions

```typescript
const githubRole = new iam.Role(this, 'GitHubActionsRole', {
  assumedBy: new iam.WebIdentityPrincipal(
    provider.openIdConnectProviderArn,
    {
      StringEquals: {
        'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
      },
      StringLike: {
        'token.actions.githubusercontent.com:sub': 'repo:lifeunsubscribe/resume-website:*',
      },
    }
  ),
  description: 'Role for GitHub Actions to deploy resume website',
});
```

**Trust Policy Conditions:**
- `aud` (audience) must be `sts.amazonaws.com`
- `sub` (subject) must match repository: `lifeunsubscribe/resume-website:*`
- Wildcard allows any branch, tag, or pull request from that repo

#### 3. IAM Permissions

**S3 Access:**
```typescript
githubRole.addToPolicy(new iam.PolicyStatement({
  actions: [
    's3:PutObject',
    's3:GetObject',
    's3:DeleteObject',
    's3:ListBucket',
  ],
  resources: [
    websiteBucket.bucketArn,
    `${websiteBucket.bucketArn}/*`,
  ],
}));
```

**CloudFront Access:**
```typescript
githubRole.addToPolicy(new iam.PolicyStatement({
  actions: ['cloudfront:CreateInvalidation'],
  resources: [`arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`],
}));
```

**Least Privilege:**
- Read/write access **only** to `www.cloudwithsarah.com` bucket
- Cache invalidation **only** for distribution `EG3WGB7ERFXYG`
- No access to other AWS resources

---

## Security Model

### Zero-Trust Architecture

This website implements **defense in depth** with multiple security layers:

#### Layer 1: S3 Bucket Security
- ✅ **Block Public Access:** All four settings enabled
- ✅ **Enforce SSL:** Denies any HTTP requests
- ✅ **Bucket Policy:** Restrictive policy allows only CloudFront
- ✅ **No Public ACLs:** Cannot be made public accidentally

#### Layer 2: CloudFront Origin Security
- ✅ **OAC with SigV4:** Every request cryptographically signed
- ✅ **Source ARN Condition:** Prevents confused deputy attacks
- ✅ **Private Origin:** S3 bucket not publicly accessible

#### Layer 3: Transport Security
- ✅ **HTTPS Enforced:** HTTP automatically redirects to HTTPS
- ✅ **TLS 1.2+:** Modern encryption protocols only
- ✅ **ACM Certificate:** Auto-renewing SSL/TLS certificate

#### Layer 4: CI/CD Security
- ✅ **OIDC Authentication:** No long-lived AWS credentials
- ✅ **Temporary Credentials:** 15-60 minute expiry
- ✅ **Repository Scoping:** Trust policy restricts to specific repo
- ✅ **Least Privilege IAM:** Minimal permissions granted

### Why OAC Instead of OAI?

**Origin Access Identity (OAI)** - Legacy approach:
- Uses special CloudFront user principal
- Limited S3 feature support
- Being phased out by AWS

**Origin Access Control (OAC)** - Modern best practice:
- Uses AWS SigV4 signing (same as API requests)
- Supports SSE-KMS encryption
- Better audit trail in CloudTrail
- Future-proof for new S3 features
- Recommended by AWS for all new deployments

**Migration Note:** AWS doesn't auto-migrate OAI → OAC. Must be done manually.

### Bucket Policy Security

**The policy prevents:**
- ❌ Direct S3 URL access (`https://www.cloudwithsarah.com.s3.amazonaws.com/index.html`)
- ❌ Access from other AWS accounts
- ❌ Access from other CloudFront distributions
- ❌ Unauthorized API calls

**Example: What happens with direct S3 access?**
```bash
$ curl https://www.cloudwithsarah.com.s3.amazonaws.com/index.html
<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>AccessDenied</Code>
  <Message>Access Denied</Message>
</Error>
```

**Only CloudFront distribution `EG3WGB7ERFXYG` can access the bucket.**

---

## Deployment Flow

### Initial Infrastructure Deployment (CDK)

**One-time setup:**

```bash
cd resume-website-cdk
npm install                    # Install dependencies
npm run build                  # Compile TypeScript → JavaScript
cdk bootstrap                  # One-time: Create CDK toolkit stack
cdk deploy --all               # Deploy both stacks
```

**What happens during `cdk deploy`:**

1. **CDK Synth Phase:**
   - Compiles TypeScript to JavaScript
   - Generates CloudFormation templates
   - Validates constructs and dependencies

2. **CloudFormation Deployment:**
   - Creates/updates S3 buckets
   - Creates CloudFront distribution (takes 5-15 minutes)
   - Creates Route53 A records
   - Requests ACM certificate
   - Creates validation CNAME
   - Waits for certificate validation
   - Attaches certificate to CloudFront

3. **Bucket Deployment:**
   - Lambda function copies files from `../resume-website-files/`
   - Uploads to S3 bucket
   - Invalidates CloudFront cache

4. **Stack Complete:**
   - Outputs CloudFront distribution URL
   - Website live at `https://www.cloudwithsarah.com`

**Typical deployment time:** 15-20 minutes (mostly CloudFront distribution creation)

### Daily Content Updates (GitHub Actions)

**Workflow trigger:**
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'resume-website-files/**'
      - '!resume-website-files/README.md'
```

**Triggers on:**
- Push to `main` branch
- Changes in `resume-website-files/` directory
- **Excludes:** README.md changes

**Workflow steps:**

```yaml
1. Checkout code
   - Uses: actions/checkout@v3

2. Configure AWS credentials
   - Uses: aws-actions/configure-aws-credentials@v2
   - Method: OIDC (OpenID Connect)
   - Assumes role: GitHubActionsRole
   - Gets temporary credentials (60 min expiry)

3. Sync files to S3
   - Command: aws s3 sync ./resume-website-files s3://www.cloudwithsarah.com
   - Options:
     * --delete: Remove files not in source
     * --exclude "*": Exclude all by default
     * --include "*.html", "*.css", "*.js": Only sync these
     * --exclude "images/headshot.JPG": Skip large binary (450KB)

4. Invalidate CloudFront cache
   - Command: aws cloudfront create-invalidation --distribution-id EG3WGB7ERFXYG --paths "/*"
   - Clears all cached content at edge locations
   - Global propagation: 30-60 seconds
```

**Optimization notes:**
- Only syncs changed files (S3 sync uses MD5 comparison)
- Excludes binary images to save time (upload manually if changed)
- Syncs HTML/CSS/JS only (fastest deployments)

**Deployment time:** 30-60 seconds

---

## File Structure & Dependencies

### Project Structure

```
resume-website/
├── .git/                                 # Git repository
├── .github/
│   └── workflows/
│       └── deploy.yml                   # CI/CD pipeline
├── .gitignore                           # Git ignore rules
│
├── resume-website-files/                # Static Site Assets
│   ├── index.html                       # Main HTML (8,658 bytes)
│   ├── styles.css                       # Styling (6,637 bytes)
│   ├── script.js                        # JavaScript (4,368 bytes)
│   ├── images/
│   │   └── headshot.JPG                 # Profile photo (450KB)
│   └── fonts/
│       └── BrittanySignature.ttf        # Custom font
│
├── resume-website-cdk/                  # CDK Infrastructure
│   ├── package.json                     # Node dependencies
│   ├── package-lock.json
│   ├── cdk.json                         # CDK configuration
│   ├── cdk.context.json                 # Cached context (Route53 zone)
│   ├── tsconfig.json                    # TypeScript config
│   ├── jest.config.js                   # Testing config
│   ├── README.md                        # CDK README
│   │
│   ├── bin/
│   │   └── resume-website-cdk.ts        # CDK app entry point
│   │
│   ├── lib/
│   │   ├── resume-website-cdk-stack.ts  # Main hosting stack
│   │   └── github-actions-role-stack.ts # CI/CD IAM stack
│   │
│   ├── test/                            # Jest unit tests
│   ├── node_modules/                    # Dependencies
│   └── cdk.out/                         # CDK synth output (CloudFormation)
│
└── docs/                                # Documentation
    └── ARCHITECTURE.md                  # This file
```

### CDK Dependencies

**From `package.json`:**

```json
{
  "dependencies": {
    "aws-cdk-lib": "^2.202.0",          // CDK construct library
    "constructs": "^10.0.0"             // Base construct classes
  },
  "devDependencies": {
    "aws-cdk": "^2.1020.2",             // CDK CLI
    "typescript": "~5.6.3",             // TypeScript compiler
    "ts-node": "^10.9.2",               // TypeScript runtime
    "jest": "^29.7.0",                  // Testing framework
    "@types/node": "^22.7.9"            // Node.js type definitions
  }
}
```

### Static Site Dependencies

**index.html:**
```
├── styles.css (local stylesheet)
├── script.js (local JavaScript, loaded with defer)
├── images/headshot.JPG
├── fonts/BrittanySignature.ttf (loaded in CSS)
└── Font Awesome 6.0.0 (CDN: cdnjs.cloudflare.com)
```

**styles.css:**
```
└── fonts/BrittanySignature.ttf (@font-face import)
```

**script.js:**
```
└── Manipulates DOM from index.html (no external dependencies)
```

### CDK Code Dependencies

**Execution flow:**
```
bin/resume-website-cdk.ts (entry point)
├── new ResumeWebsiteCdkStack(app, ...)
│   └── Imports from lib/resume-website-cdk-stack.ts
│       ├── aws-cdk-lib/aws-s3
│       ├── aws-cdk-lib/aws-cloudfront
│       ├── aws-cdk-lib/aws-route53
│       ├── aws-cdk-lib/aws-certificatemanager
│       ├── aws-cdk-lib/aws-s3-deployment
│       └── aws-cdk-lib/aws-iam
│
└── new GitHubActionsRoleStack(app, ...)
    └── Imports from lib/github-actions-role-stack.ts
        └── aws-cdk-lib/aws-iam
```

### Context Files

**cdk.context.json:**
```json
{
  "hosted-zone:account=342587863995:domainName=cloudwithsarah.com:region=us-east-1": {
    "Id": "/hostedzone/Z0935238159PZ4YC8L3ZJ",
    "Name": "cloudwithsarah.com."
  }
}
```

**Purpose:**
- Caches Route53 hosted zone lookup
- Avoids repeated API calls during `cdk synth`
- **Should be committed to git** for consistent builds

---

## Architectural Decisions

### 1. Why Static Site Instead of Dynamic?

**Advantages:**
- ✅ **Cost:** S3 + CloudFront costs ~$1-5/month for typical traffic
- ✅ **Performance:** Served from 400+ edge locations worldwide
- ✅ **Scalability:** Infinite horizontal scaling (no server limits)
- ✅ **Security:** No server to hack, no database to compromise
- ✅ **Maintenance:** No OS patches, no dependency updates
- ✅ **Reliability:** 99.99% SLA from AWS (no server downtime)

**Trade-offs:**
- ❌ No server-side rendering
- ❌ No real-time dynamic content
- ❌ Contact forms require third-party services

**Verdict:** For a portfolio website, static is ideal.

### 2. Why CDK Instead of Terraform/CloudFormation?

**CDK Advantages:**
- ✅ **Type Safety:** TypeScript catches errors at compile time
- ✅ **Abstraction:** High-level constructs (e.g., `BucketDeployment`)
- ✅ **IDE Support:** Autocomplete, inline docs, refactoring
- ✅ **Testing:** Unit tests with Jest
- ✅ **Reusability:** Create custom constructs, share across projects

**vs. Terraform:**
- Multi-cloud not needed (AWS-only portfolio)
- CDK generates CloudFormation (native AWS integration)

**vs. Raw CloudFormation:**
- CloudFormation is verbose (hundreds of lines for this stack)
- CDK reduces code by ~70%

**Verdict:** CDK provides best developer experience for AWS-only projects.

### 3. Why Two Separate Stacks?

**Reason for separation:**

1. **ResumeWebsiteCdkStack** - Website infrastructure
   - Changes rarely (only when modifying infrastructure)
   - Contains all hosting resources

2. **GitHubActionsRoleStack** - CI/CD permissions
   - Independent lifecycle
   - Can be updated without touching website
   - Easier to audit IAM changes

**Alternative:** Could combine into one stack, but separation provides:
- Clearer separation of concerns
- Easier to delete/recreate CI/CD stack
- Better CloudFormation change visibility

### 4. Why OIDC Instead of IAM Access Keys?

**OIDC (OpenID Connect) Advantages:**
- ✅ **No Secrets:** No AWS credentials stored in GitHub
- ✅ **Temporary:** Credentials expire after 15-60 minutes
- ✅ **Audit Trail:** CloudTrail shows which workflow assumed role
- ✅ **Rotation-Free:** No need to rotate access keys
- ✅ **Least Privilege:** Can scope to specific repos/branches

**vs. IAM Access Keys:**
- ❌ Long-lived credentials (never expire)
- ❌ Must be rotated regularly
- ❌ Risk of exposure in logs/repos
- ❌ Hard to audit which workflow used them

**Verdict:** OIDC is AWS best practice for CI/CD (mandated by many security teams).

### 5. Why us-east-1 Region?

**CloudFront Requirement:**
- ACM certificates for CloudFront **must** be in `us-east-1`
- CloudFront is a global service (no specific region)
- Certificate validation via Route53 works from any region

**Alternatives:**
- Could host S3 bucket in different region
- But us-east-1 is typically cheapest for S3

**Verdict:** us-east-1 is standard for CloudFront + ACM deployments.

### 6. Why Cache Invalidation on Every Deploy?

**Current approach:**
```bash
aws cloudfront create-invalidation --paths "/*"
```

**Invalidates everything** after each deployment.

**Alternatives:**
1. **Versioned URLs** (e.g., `style.v123.css`)
   - More complex build process
   - No invalidation needed (new URLs auto-bust cache)

2. **Selective invalidation** (e.g., only changed files)
   - Requires tracking which files changed
   - Can miss dependencies (e.g., JS includes CSS)

**Trade-offs:**
- Full invalidation costs $0.005 per path (first 1,000 free/month)
- Ensures visitors always see latest content
- Simple, reliable, low cost

**Verdict:** Full invalidation is simplest for low-traffic portfolio.

---

## What Would Break If...

### Scenario 1: Change S3 Bucket Name

**Breaking changes:**
- 💥 CloudFront origin URL mismatch
- 💥 Route53 DNS points to old bucket
- 💥 GitHub Actions sync target incorrect
- 💥 Bucket policy references wrong bucket

**How to fix:**
1. Update `bucketName` in `resume-website-cdk-stack.ts`
2. Update GitHub Actions secret `S3_BUCKET_NAME` (if exists)
3. Run `cdk deploy`
4. Update any hardcoded references

**Downtime:** ~15 minutes (CloudFront distribution update)

### Scenario 2: Delete cdk.context.json

**Breaking changes:**
- ⚠️ CDK re-queries Route53 on every `cdk synth` (slower)
- ⚠️ If hosted zone doesn't exist, deployment fails

**How to fix:**
1. Run `cdk synth` - regenerates context
2. Commit new `cdk.context.json`

**Downtime:** None (existing resources unaffected)

### Scenario 3: Remove OAC

**Breaking changes:**
- 💥 CloudFront can't access S3 bucket
- 💥 Bucket policy allows CloudFront but no auth mechanism
- 💥 Website returns 403 Forbidden

**How to fix:**
1. Add OAC back to CDK stack
2. Run `cdk deploy`

**Alternative:** Make bucket public (❌ bad security practice)

**Downtime:** Immediate (website breaks until fixed)

### Scenario 4: Change CloudFront Distribution

**Breaking changes:**
- 💥 S3 bucket policy references old distribution ARN
- 💥 Route53 A records point to old distribution
- 💥 ACM certificate attached to old distribution
- 💥 GitHub Actions invalidation targets wrong distribution

**How to fix:**
1. Update bucket policy with new distribution ARN
2. Update Route53 A records
3. Reattach certificate
4. Update GitHub Actions secret

**Better approach:** Let CDK handle updates (don't manually change)

**Downtime:** ~15 minutes (CloudFront propagation)

### Scenario 5: Change Domain Name

**Breaking changes:**
- 💥 ACM certificate doesn't cover new domain
- 💥 Route53 records point to wrong domain
- 💥 S3 bucket naming convention breaks

**How to fix:**
1. Register new domain in Route53
2. Create new hosted zone
3. Update `domainName` in CDK stack
4. Request new ACM certificate
5. Update all domain references
6. Run `cdk deploy`

**Downtime:** 5-30 minutes (DNS propagation + certificate validation)

### Scenario 6: GitHub Repo Rename

**Breaking changes:**
- 💥 OIDC trust policy restricts to `lifeunsubscribe/resume-website`
- 💥 GitHub Actions can't assume IAM role
- 💥 Deployments fail with authentication error

**How to fix:**
1. Update `github-actions-role-stack.ts`:
   ```typescript
   'token.actions.githubusercontent.com:sub': 'repo:NEW-ORG/NEW-REPO:*'
   ```
2. Run `cdk deploy GitHubActionsRoleStack`

**Downtime:** None (website unaffected, only deployments break)

### Scenario 7: Delete GitHub Actions Workflow

**Breaking changes:**
- ⚠️ No automated deployments
- ⚠️ Must deploy manually via CDK

**How to fix:**
1. Restore `.github/workflows/deploy.yml`
2. Next push will trigger workflow

**Alternative:** Deploy manually:
```bash
cd resume-website-cdk
npm run deploy
```

**Downtime:** None (existing site unaffected)

---

## Troubleshooting

### Problem: Website Returns 403 Forbidden

**Possible causes:**
1. **OAC not configured** - CloudFront can't access S3
2. **Bucket policy incorrect** - Wrong distribution ARN
3. **File doesn't exist** - Requested path not in S3

**Debugging steps:**
```bash
# Check CloudFront distribution settings
aws cloudfront get-distribution --id EG3WGB7ERFXYG

# Check S3 bucket policy
aws s3api get-bucket-policy --bucket www.cloudwithsarah.com

# List files in bucket
aws s3 ls s3://www.cloudwithsarah.com/

# Test direct S3 access (should fail with 403)
curl https://www.cloudwithsarah.com.s3.amazonaws.com/index.html
```

**Fix:**
- Verify OAC attached to CloudFront origin
- Verify bucket policy has correct distribution ARN
- Redeploy with `cdk deploy`

### Problem: Certificate Validation Stuck

**Possible causes:**
1. **DNS records not created** - CNAME missing in Route53
2. **Wrong hosted zone** - Certificate validation CNAME in wrong zone
3. **Propagation delay** - DNS not propagated yet

**Debugging steps:**
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn <ARN>

# Check Route53 records
aws route53 list-resource-record-sets --hosted-zone-id Z0935238159PZ4YC8L3ZJ

# Test DNS propagation
dig _<validation-hash>.cloudwithsarah.com CNAME
```

**Fix:**
- Wait 5-30 minutes for DNS propagation
- Verify CNAME exists in Route53
- Delete and recreate certificate if stuck > 1 hour

### Problem: GitHub Actions Deployment Fails

**Possible causes:**
1. **OIDC role assumption fails** - Trust policy incorrect
2. **Insufficient permissions** - IAM policy too restrictive
3. **Wrong secrets** - GitHub secrets outdated

**Debugging steps:**
```bash
# Check GitHub Actions logs (in GitHub UI)

# Verify IAM role trust policy
aws iam get-role --role-name GitHubActionsRole

# Verify IAM role permissions
aws iam get-role-policy --role-name GitHubActionsRole --policy-name <PolicyName>
```

**Common errors:**

**Error:** `User: arn:aws:sts::xxx:assumed-role/GitHubActionsRole is not authorized`
**Fix:** Add missing permission to IAM role policy

**Error:** `An error occurred (AccessDenied) when calling the AssumeRoleWithWebIdentity operation`
**Fix:** Verify trust policy includes correct repository name

### Problem: Changes Not Appearing on Live Site

**Possible causes:**
1. **CloudFront cache not invalidated** - Old content cached
2. **Browser cache** - Local cache not cleared
3. **DNS cache** - Old DNS record cached

**Debugging steps:**
```bash
# Check CloudFront cache behavior
aws cloudfront get-distribution-config --id EG3WGB7ERFXYG

# Create manual invalidation
aws cloudfront create-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --paths "/*"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id EG3WGB7ERFXYG \
  --id <InvalidationID>

# Force browser refresh
# Chrome: Cmd+Shift+R (Mac) or Ctrl+F5 (Windows)
```

**Fix:**
- Create CloudFront invalidation
- Clear browser cache
- Wait 1-2 minutes for propagation

### Problem: CDK Deploy Fails

**Possible causes:**
1. **TypeScript compilation errors** - Syntax errors in code
2. **CloudFormation errors** - Resource conflicts
3. **AWS credentials expired** - Need to re-authenticate

**Debugging steps:**
```bash
# Check TypeScript compilation
npm run build

# Synthesize CloudFormation template (without deploying)
cdk synth

# View diff before deploying
cdk diff

# Deploy with verbose logging
cdk deploy --verbose
```

**Common errors:**

**Error:** `Certificate validation timed out`
**Fix:** Check Route53 CNAME records, wait longer

**Error:** `Bucket already exists`
**Fix:** Bucket names must be globally unique, choose different name

**Error:** `Rate exceeded`
**Fix:** Too many CloudFormation API calls, wait and retry

### Problem: High CloudFront Costs

**Possible causes:**
1. **No caching** - Cache TTL too short
2. **High traffic** - Unusual traffic spike
3. **Large files** - Serving many large assets

**Debugging steps:**
```bash
# Check CloudFront metrics (AWS Console)
# Billing & Cost Management → Cost Explorer

# Check cache hit ratio
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=EG3WGB7ERFXYG \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-31T23:59:59Z \
  --period 86400 \
  --statistics Average
```

**Fix:**
- Increase cache TTL for static assets
- Enable compression (gzip/brotli)
- Optimize image sizes
- Set up CloudFront usage alarms

---

## Additional Resources

**AWS Documentation:**
- [CloudFront with OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

**CDK API Reference:**
- [aws-cdk-lib](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html)
- [CloudFront Construct Library](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront-readme.html)

**Cost Optimization:**
- [CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)

---

**Last Updated:** January 2026
**Maintainer:** Sarah Wadley
**Questions?** Review deployment logs, check AWS Console, or reference this doc.
