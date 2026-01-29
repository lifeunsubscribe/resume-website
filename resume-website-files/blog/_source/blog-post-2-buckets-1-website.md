# 2 Buckets 1 Website

## How CloudFront Changes this Fundamental Rule

*I followed the "canonical" AWS approach, created zombie infrastructure, and discovered the modern way nobody's talking about.*

---

## The Setup

I was building my portfolio website on AWS. S3, CloudFront, Route53 — the whole serverless static site stack. Everything was going great until I got to a seemingly simple question:

**How do I make `cloudwithsarah.com` redirect to `www.cloudwithsarah.com`?**

I did what any reasonable developer does. I googled it. I found the [AWS docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/how-to-page-redirect.html). I found tutorials. I found a [Reddit thread from 2018](https://www.reddit.com/r/aws/comments/7va4vk/do_you_have_to_make_two_s3_buckets_for_your/) where someone asked the exact same question.

The answer was unanimous: **you need two S3 buckets.**

[📸 IMAGE: "Guess I'll just do what the docs say" resignation meme OR "This is fine" dog]

One bucket holds your actual website files. The other bucket exists solely to redirect traffic to the first one. The AWS docs literally say:

> "If your root domain is example.com, and you want to serve requests for both http://example.com and http://www.example.com, **you must create two buckets** named example.com and www.example.com."

The docs called it the method. [Stack Overflow agreed](https://stackoverflow.com/questions/10115799/set-up-dns-based-url-forwarding-in-amazon-route53). [Reddit agreed](https://www.reddit.com/r/aws/comments/7va4vk/do_you_have_to_make_two_s3_buckets_for_your/). [Blog posts from 2025 are STILL recommending it](https://www.stxnext.com/blog/devops-hosting-static-websites-aws-s3). Who was I to argue?

So I created two buckets, wrote my CDK code, deployed everything, tested both URLs, and they both worked. 

Mission accomplished. 

...Right?

---

## Why Does This Even Matter?

Before we go further, let's talk about why anyone cares whether your site is `www.example.com` or `example.com`.

**The SEO Problem:** If both URLs serve the same content, search engines might treat them as two separate websites with identical content. This can dilute your page rank — Google sees two mediocre sites instead of one authoritative one. They've gotten smarter about this, but "just do the redirect" is still standard advice.

**The Cache Problem:** If CloudFront caches content for both `www.example.com/page` AND `example.com/page`, you're storing the same bytes twice at every edge location worldwide. That's wasteful and potentially confusing.

**The User Problem:** Some people type `www`, some don't. You want them all to end up in the same place with a consistent URL in their address bar.

**The Solution:** Pick one (www or non-www) as your "canonical" URL, and 301 redirect the other. A 301 tells browsers and search engines "this content has permanently moved here — update your bookmarks."

Simple enough concept. The implementation? That's where AWS gets... AWS-y.

---

## The "Official" Two-Bucket Method

Here's what the AWS docs tell you to do (and what countless tutorials repeat):

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE CLASSIC S3-ONLY APPROACH                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User types example.com                                        │
│          │                                                       │
│          ▼                                                       │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│   │   Route53   │────▶│ S3 Bucket   │────▶│ S3 Bucket   │       │
│   │  A Record   │     │ example.com │     │www.example  │       │
│   └─────────────┘     │ (redirect)  │ 301 │ (content)   │       │
│                       └─────────────┘     └─────────────┘       │
│                                                                  │
│   The redirect bucket catches the request and bounces           │
│   the user to the content bucket with a 301 redirect.           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Why S3 needs two buckets for this:**

S3's static website hosting feature can do ONE of two things:
- **Host content** (serve your HTML/CSS/JS files), OR  
- **Redirect all requests** to another hostname

It cannot do both. There's no "serve content for www requests but redirect non-www requests" option. 
So if you want redirection behavior, you need a separate bucket configured just for that purpose. The redirect bucket is essentially a single-purpose traffic cop.

This made perfect sense to me. I implemented it in CDK:

```typescript
// The content bucket - holds actual website files
const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
  bucketName: 'www.cloudwithsarah.com',
  // ... website hosting config
});

// The redirect bucket - completely empty, just redirects
const redirectBucket = new s3.Bucket(this, 'RedirectBucket', {
  bucketName: 'cloudwithsarah.com',
  websiteRedirect: {
    hostName: 'www.cloudwithsarah.com',
    protocol: s3.RedirectProtocol.HTTPS
  },
});
```

Both URLs worked. I moved on with my life.

---

## Fast Forward: The Investigation

Months later, I was optimizing my site and started poking around my infrastructure. I ran a simple curl command to check my headers:

```bash
curl -I https://cloudwithsarah.com
```

**If my redirect was working, I would see:**
```
HTTP/2 301
location: https://www.cloudwithsarah.com/
```

**But what I actually saw was:**
```
HTTP/2 200
content-type: text/html
server: AmazonS3
x-cache: Miss from cloudfront
```

[📸 IMAGE: Confused math lady meme]

Wait. **HTTP 200?** 

That's not a redirect. That's a successful response serving actual content.

I checked my browser. Typed `https://cloudwithsarah.com/` explicitly. The page loaded... but the URL bar still showed `https://cloudwithsarah.com`. It never changed to `www`.

[📸 IMAGE: "Always has been" astronaut meme - "Wait, it's all serving duplicate content?" "Always has been"]

My redirect bucket was doing absolutely nothing. Both URLs were just... serving the same content. The exact duplicate content situation I was trying to avoid.

### The Browser Deception

Here's what made this extra sneaky: sometimes when I typed `cloudwithsarah.com` (without the https://), it DID show up as `www.cloudwithsarah.com`. 

But that wasn't my redirect working — that was my browser "helpfully" autocompleting from my browsing history! When I explicitly typed `https://cloudwithsarah.com/`, bypassing autocomplete, the truth was revealed: no redirect. Just duplicate content.

**Lesson:** Always test redirects with `curl -I`, not by typing in your browser. Browsers lie to you. They're trying to be helpful. They are not.

---

## The Zombie Bucket 🧟

[📸 IMAGE: Skeleton on couch with laptop - "My redirect bucket waiting for literally any traffic"]

Here's what I found when I actually looked at my CDK code.
**Both Route53 A records point to CloudFront.** Not to S3:

```typescript
// My CloudFront distribution
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  domainNames: ['cloudwithsarah.com', 'www.cloudwithsarah.com'],  // 👀 BOTH domains
  defaultBehavior: {
    origin: S3BucketOrigin.withOriginAccessControl(websiteBucket),  // Points to www bucket
  },
});

// My Route53 records
new route53.ARecord(this, 'RootRecord', {
  recordName: 'cloudwithsarah.com',
  target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))  // 👀 CloudFront
});

new route53.ARecord(this, 'WwwRecord', {
  recordName: 'www.cloudwithsarah.com', 
  target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))  // 👀 CloudFront
});
```

See the problem?

 CloudFront is configured to serve content from `www.cloudwithsarah.com` bucket for BOTH domain names.

The redirect bucket exists. It's configured correctly. It would totally redirect if anyone ever talked to it.

But nobody does. 

Traffic for `cloudwithsarah.com` goes: Route53 → CloudFront → content bucket → serves content. The redirect bucket is never consulted. It's a ghost. A zombie. A perfectly configured piece of infrastructure doing absolutely nothing, waiting for traffic that will never arrive.

[📸 IMAGE: Another zombie/skeleton meme option here]

---

# ⚠️ THE PLOT TWIST: CloudFront Changes Everything

This is the part nobody explains clearly. **This is the whole point of this article.** If you take nothing else away, take this:

## The Two-Bucket Pattern Was Designed for S3-Only Hosting

The AWS docs, the tutorials, the Stack Overflow answers — they all assume a world where **S3 is your edge**. Meaning: users' browsers talk directly to S3.

In that S3-only world:

```
┌─────────────────────────────────────────────────────────────────┐
│                        S3-ONLY HOSTING                           │
│                (What the tutorials assume)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. User visits example.com                                    │
│   2. Route53 points to S3 website endpoint for example.com      │
│   3. S3 redirect bucket catches the request                     │
│   4. S3 returns 301 redirect to www.example.com                 │
│   5. Browser follows redirect                                    │
│   6. Route53 points to S3 website endpoint for www bucket       │
│   7. S3 serves content                                          │
│                                                                  │
│   The redirect bucket is IN THE PATH. It gets hit.              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**But modern static sites use CloudFront.** You need CloudFront for:
- HTTPS with a custom domain (S3 website endpoints are HTTP-only!)
- Security (private buckets with OAC)
- Performance (global CDN caching)
- Security headers (CSP, HSTS, etc.)

And when you add CloudFront, the architecture fundamentally changes:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLOUDFRONT HOSTING                           │
│              (What you're actually building)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. User visits example.com                                    │
│   2. Route53 points to CloudFront (NOT S3!)                     │
│   3. CloudFront says "I serve both domains"                     │
│   4. CloudFront fetches from origin bucket                      │
│   5. Content is served                                          │
│   6. NO REDIRECT EVER HAPPENS                                   │
│                                                                  │
│   The redirect bucket is NEVER IN THE PATH.                     │
│   Route53 bypasses it entirely by going to CloudFront.          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**CloudFront becomes your edge.** Route53 points to CloudFront, not S3. CloudFront handles both domains. The redirect bucket sits there, configured perfectly, completely unused.

This is why I had zombie infrastructure. I followed S3-only tutorials while building a CloudFront architecture.

---

## The Options: A Complete Comparison

So what ARE your actual options for handling www redirects in 2026?

### Option 1: Two Buckets + Two CloudFront Distributions

The "make the old pattern work with CloudFront" approach.

```
example.com ──▶ CloudFront #1 ──▶ S3 redirect bucket ──▶ 301
                                         │
                                         ▼
www.example.com ──▶ CloudFront #2 ──▶ S3 content bucket
```

| Pros | Cons |
|------|------|
| Follows AWS docs | Two CloudFront distributions ($$$) |
| Conceptually familiar | Two S3 buckets to manage |
| | Redirect bucket needs public access OR website endpoint origin |
| | More complex infrastructure |
| | More things that can break |

**Why people choose this:** It's what the docs say. It's what tutorials show. It feels "official."

**Why it's not ideal:** You're paying for and managing double the infrastructure just to redirect traffic. And the redirect bucket's requirement for public access or website endpoint origin conflicts with modern OAC security practices.

---

### Option 2: One Bucket + Both Domains on CloudFront (No Redirect)

This is what I accidentally built. 🤡

```
example.com ─────┐
                 ├────▶ CloudFront ────▶ S3 bucket
www.example.com ─┘
```

| Pros | Cons |
|------|------|
| Simple setup | NO REDIRECT — both URLs serve content |
| Single distribution | Duplicate content SEO issues |
| Works with private buckets + OAC | Cache inefficiency |
| Cheap | Unprofessional (different URLs for same content) |

**Why people end up here:** They follow CloudFront tutorials that don't mention redirects, or they follow redirect tutorials without realizing CloudFront changes everything. The site "works" so they don't investigate further.

**Why it's problematic:** You're telling search engines you have two websites with identical content. That's not a great look.

---

### Option 3: CloudFront Functions (The Modern Way) ✨

One bucket. One distribution. Actual redirect. Edge-powered.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   example.com ─────┐      ┌──────────────────┐                  │
│                    │      │ CloudFront Func  │                  │
│                    ├─────▶│                  │                  │
│   www.example.com ─┘      │ if (!www) {      │                  │
│                           │   return 301     │                  │
│                           │ }                │                  │
│                           └────────┬─────────┘                  │
│                                    │                             │
│                       www requests pass through                 │
│                                    │                             │
│                                    ▼                             │
│                           ┌──────────────────┐                  │
│                           │    CloudFront    │                  │
│                           │   Distribution   │                  │
│                           └────────┬─────────┘                  │
│                                    │                             │
│                                    ▼                             │
│                           ┌──────────────────┐                  │
│                           │    S3 Bucket     │                  │
│                           │    (private)     │                  │
│                           └──────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Single S3 bucket | Requires writing ~10 lines of JavaScript |
| Single CloudFront distribution | ...that's it. That's the only con. |
| Proper 301 redirect | |
| Works with private buckets + OAC | |
| Runs at the edge (sub-millisecond) | |
| 2 million FREE invocations/month | |
| Clean IaC (all in CDK) | |

**Why people don't know about this:** CloudFront Functions launched in 2021. The tutorials, Stack Overflow answers, and even some AWS docs predate this. The two-bucket pattern became "common knowledge" before a better option existed.

**Why it's the right choice:** It's simpler, cheaper, more secure, and actually works. The only reason NOT to use it is if you don't have CloudFront — but if you don't have CloudFront in 2026, you probably should.

---

### Option 4: Lambda@Edge

Like CloudFront Functions but more powerful (and more expensive).

| Pros | Cons |
|------|------|
| Can do complex logic | $0.60 per million invocations (vs $0.10) |
| Access to request body | Higher latency |
| Longer execution time | More complex deployment |
| | us-east-1 requirement |

**Why you might choose this:** You need to inspect request bodies, run for longer than 1ms, or do something CloudFront Functions can't handle.

**Why it's overkill for redirects:** A www redirect is literally 10 lines of code that runs in microseconds. Lambda@Edge is a sledgehammer for a thumbtack.

---

## The Solution: CloudFront Functions + CDK

Here's how to actually implement www redirects the modern way.

### The CloudFront Function

```typescript
// In your CDK stack
const wwwRedirect = new cloudfront.Function(this, 'WwwRedirect', {
  functionName: 'www-redirect',
  code: cloudfront.FunctionCode.fromInline(`
    function handler(event) {
      var request = event.request;
      var host = request.headers.host.value;
      
      // If request is for non-www, redirect to www
      if (!host.startsWith('www.')) {
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: {
            'location': { value: 'https://www.' + host + request.uri }
          }
        };
      }
      
      // Otherwise, continue to origin
      return request;
    }
  `),
});
```

That's it. That's the whole redirect logic. 10 lines.

### Attach It to CloudFront

```typescript
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  domainNames: ['cloudwithsarah.com', 'www.cloudwithsarah.com'],
  defaultBehavior: {
    origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    functionAssociations: [{
      function: wwwRedirect,
      eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
    }],
  },
  certificate: certificate,
});
```

### Kill the Zombie

```typescript
// DELETE THIS — you don't need it anymore!
// const redirectBucket = new s3.Bucket(this, 'RedirectBucket', {
//   bucketName: rootDomain,
//   websiteRedirect: { ... }
// });

// 🪦 Rest in peace, little bucket. You were configured perfectly.
// You just never got any traffic.
```

### Verify It Works

After deploying:

```bash
$ curl -I https://cloudwithsarah.com

HTTP/2 301
location: https://www.cloudwithsarah.com/
server: CloudFront
x-cache: FunctionGeneratedResponse from cloudfront
```

🎉 **301 redirect!** The URL changes in browsers, search engines understand your canonical URL, and you're running lean infrastructure.

---

## Full Working CDK Stack

Here's the complete, copy-paste-ready solution:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export class ModernStaticSiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const rootDomain = 'example.com';  // Change this
    const wwwDomain = `www.${rootDomain}`;

    // ============================================
    // ONE bucket. That's all you need.
    // ============================================
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: wwwDomain,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,  // Private!
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ============================================
    // DNS & Certificate
    // ============================================
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: rootDomain,
    });

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: rootDomain,
      subjectAlternativeNames: [wwwDomain],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // ============================================
    // THE MAGIC: CloudFront Function for redirect
    // ============================================
    const wwwRedirect = new cloudfront.Function(this, 'WwwRedirect', {
      functionName: `${rootDomain.replace(/\./g, '-')}-www-redirect`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          var host = request.headers.host.value;
          
          if (!host.startsWith('www.')) {
            return {
              statusCode: 301,
              statusDescription: 'Moved Permanently',
              headers: {
                'location': { value: 'https://www.' + host + request.uri }
              }
            };
          }
          return request;
        }
      `),
    });

    // ============================================
    // ONE CloudFront distribution
    // ============================================
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      domainNames: [rootDomain, wwwDomain],
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [{
          function: wwwRedirect,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      certificate: certificate,
    });

    // ============================================
    // Route53 — both domains point to CloudFront
    // ============================================
    new route53.ARecord(this, 'RootRecord', {
      zone: hostedZone,
      recordName: rootDomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    new route53.ARecord(this, 'WwwRecord', {
      zone: hostedZone,
      recordName: 'www',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });
  }
}
```

---

## When You Actually Need Two Buckets

To be fair, the AWS docs aren't *wrong* — they're just written for a specific scenario.

**Use two buckets when:**
- You're doing S3-only hosting (no CloudFront) — maybe for a quick internal tool
- You need S3 website endpoints specifically (rare)
- You're maintaining a legacy setup and can't justify the migration effort

**Use CloudFront Functions when:**
- You're using CloudFront (you should be for any production site)
- You want private buckets with OAC (modern security best practice)
- You prefer minimal, maintainable infrastructure
- You're using infrastructure as code

For essentially any static website in 2026? **CloudFront Functions is the answer.**

---

## Bonus: Other Modern Best Practices

While you're modernizing your redirect, here are other 2026 best practices worth implementing:

### Use OAC, Not OAI

**What:** Origin Access Control (OAC) is the modern way for CloudFront to access private S3 buckets. It replaced Origin Access Identity (OAI).

**Why it matters:** OAC uses AWS SigV4 signing (the same authentication your AWS CLI uses), provides better CloudTrail audit logging, and supports newer S3 features like SSE-KMS encryption. OAI is deprecated and has known limitations.

```typescript
// ✅ Modern: OAC (Origin Access Control)
origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(bucket)

// ❌ Legacy: OAI (Origin Access Identity) — deprecated!
origin: new cloudfrontOrigins.S3Origin(bucket)
```

### Add Security Headers

**What:** HTTP headers that tell browsers to enable security features.

**Why it matters:** These headers protect against common attacks like clickjacking (X-Frame-Options), XSS (Content-Security-Policy), and protocol downgrade attacks (Strict-Transport-Security). Adding them demonstrates security awareness — something technical interviewers notice.

```typescript
const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
  securityHeadersBehavior: {
    strictTransportSecurity: {
      accessControlMaxAge: cdk.Duration.days(365),
      includeSubdomains: true,
      preload: true,
      override: true,
    },
    contentTypeOptions: { override: true },  // Prevents MIME sniffing
    frameOptions: { 
      frameOption: cloudfront.HeadersFrameOption.DENY,  // Prevents clickjacking
      override: true 
    },
    xssProtection: { 
      protection: true, 
      modeBlock: true, 
      override: true 
    },
  },
});
```

### Use OIDC for CI/CD, Not Access Keys

**What:** OpenID Connect lets GitHub Actions authenticate with AWS using temporary credentials instead of stored access keys.

**Why it matters:** Access keys are long-lived secrets. If they leak (and secrets leak), attackers have permanent access until you notice and revoke them. OIDC credentials expire in minutes and are never stored anywhere. It's the difference between leaving a house key under your mat vs using a one-time entry code.

```typescript
const provider = new iam.OpenIdConnectProvider(this, 'GitHubOIDC', {
  url: 'https://token.actions.githubusercontent.com',
  clientIds: ['sts.amazonaws.com'],
});
```

---

## Lessons Learned

[📸 IMAGE: "The More You Know" rainbow OR appropriate conclusion meme]

1. **Understand WHY, not just HOW.** I followed tutorials without understanding the architecture they assumed. The two-bucket approach made sense for S3-only hosting — but I wasn't doing S3-only hosting.

2. **Test your assumptions.** A simple `curl -I` would have revealed the problem immediately. I assumed "both URLs load the site" meant "the redirect is working." It didn't.

3. **Documentation lags behind features.** The two-bucket method is still documented as standard, but it predates CloudFront Functions (2021). Just because something is in the official docs doesn't mean it's the best current approach.

4. **Infrastructure as code reveals intent.** Looking at my CDK code made the problem obvious — both Route53 records pointed to CloudFront. The redirect bucket was never in the request path. IaC isn't just about automation; it's documentation that can't lie.

5. **Communities perpetuate outdated patterns.** That Reddit thread from 2018 wasn't wrong at the time — CloudFront Functions didn't exist. But copying 8-year-old solutions for modern infrastructure creates zombie infrastructure.

---

## TL;DR

<div style="border: 2px solid #10b981; border-radius: 8px; padding: 20px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); margin: 20px 0;">

### 🎯 The Modern Static Site Stack

For any static website using CloudFront (which should be all of them):

- ✅ **1 S3 bucket** (private, Block Public Access ON)
- ✅ **1 CloudFront distribution** with OAC
- ✅ **1 CloudFront Function** for www redirect (~10 lines)
- ✅ **1 ACM certificate** (covers both domains)
- ✅ **Route53 A records** pointing both domains to CloudFront

**No zombie buckets. No duplicate content. No wasted infrastructure.**

</div>

| If you're using... | Do this |
|-------------------|---------|
| S3-only hosting (no CloudFront) | Two buckets, S3 website redirect |
| CloudFront (like everyone in 2026) | **One bucket + CloudFront Function** |
| CloudFront + complex logic needs | Lambda@Edge (but probably not) |

---

## Resources

- [AWS S3 Redirect Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/how-to-page-redirect.html) — The "canonical" two-bucket approach (for historical context)
- [AWS CloudFront Functions Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html) — The modern approach
- [Mastering URL Redirections with AWS CloudFront Functions](https://www.tecracer.com/blog/2024/08/mastering-url-redirections-with-aws-cloudfront-functions.html) — Great 2024 article that gets it right
- [That Reddit Thread From 2018](https://www.reddit.com/r/aws/comments/7va4vk/do_you_have_to_make_two_s3_buckets_for_your/) — Where my confusion began (and where CloudFront Functions didn't exist yet)

---

*Sarah Wadley is a Software Engineer and Cloud Architect who specializes in finding zombie infrastructure in AWS accounts. When she's not debugging redirect configurations, she's probably adding security headers to things. Currently seeking her next role — check out her [portfolio](https://www.cloudwithsarah.com) or connect on [LinkedIn](https://www.linkedin.com/in/sarah-wadley/).*
