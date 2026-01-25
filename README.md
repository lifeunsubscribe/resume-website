# Sarah Wadley - Portfolio Website

**Live Site:** [www.cloudwithsarah.com](https://www.cloudwithsarah.com)

A production-grade serverless portfolio website built with modern AWS cloud architecture and fully automated CI/CD deployment.

## 🏗️ Architecture Overview

This project showcases infrastructure-as-code best practices using AWS CDK (TypeScript) with a static website hosted on AWS:

- **Frontend:** Static HTML/CSS/JavaScript
- **Infrastructure:** AWS CDK (TypeScript)
- **Hosting:** Amazon S3 + CloudFront CDN
- **DNS:** Route53 with ACM SSL/TLS certificate
- **Security:** Origin Access Control (OAC) with private S3 bucket
- **CI/CD:** GitHub Actions with OIDC authentication (no long-lived credentials)

## 🚀 Key Features

### Infrastructure
- **Fully automated deployment** using AWS CDK CloudFormation stacks
- **Global content delivery** via CloudFront edge locations
- **Zero-trust security model** - S3 bucket fully private with OAC-signed requests
- **Serverless architecture** - no servers to manage, infinite scalability
- **Infrastructure as Code** - entire stack version-controlled and reproducible

### CI/CD Pipeline
- **GitHub Actions** workflow with AWS OIDC integration
- **Temporary credentials only** - no AWS secrets stored in GitHub
- **Automatic cache invalidation** after deployments
- **Selective sync** - optimized to deploy only changed content files

### Security Highlights
- Private S3 bucket with Block Public Access enabled
- CloudFront Origin Access Control (OAC) with AWS SigV4 signing
- HTTPS enforced across all domains
- SSL/TLS certificate auto-renewed by ACM
- Repository-scoped IAM permissions

## 📁 Project Structure

```
resume-website/
├── resume-website-files/          # Static website assets
│   ├── index.html                 # Main HTML
│   ├── styles.css                 # Styling
│   ├── script.js                  # Client-side JavaScript
│   ├── images/                    # Images and assets
│   └── fonts/                     # Custom fonts
│
├── resume-website-cdk/            # AWS CDK Infrastructure
│   ├── bin/                       # CDK app entry point
│   ├── lib/                       # Stack definitions
│   │   ├── resume-website-cdk-stack.ts       # Main hosting stack
│   │   └── github-actions-role-stack.ts      # CI/CD IAM stack
│   └── test/                      # Infrastructure tests
│
├── .github/workflows/             # CI/CD automation
│   └── deploy.yml                 # GitHub Actions pipeline
│
└── docs/                          # Documentation
    └── ARCHITECTURE.md            # Detailed technical documentation
```

## 🔧 Tech Stack

**Cloud Infrastructure:**
- AWS S3 (static hosting)
- AWS CloudFront (CDN)
- AWS Route53 (DNS)
- AWS Certificate Manager (SSL/TLS)
- AWS IAM (security & permissions)

**Infrastructure as Code:**
- AWS CDK 2.x (TypeScript)
- CloudFormation (generated from CDK)

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Font Awesome icons
- Responsive design

**DevOps:**
- GitHub Actions (CI/CD)
- OpenID Connect (OIDC) authentication
- Automated testing with Jest

## 📚 Documentation

- **[Architecture Deep Dive](docs/ARCHITECTURE.md)** - Complete technical documentation covering CDK stacks, security model, deployment flows, and architectural decisions
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Step-by-step deployment instructions (coming in Phase 4)

## 🌐 Deployment Flow

```
Developer pushes to main
    ↓
GitHub Actions triggered
    ↓
Authenticate via OIDC (temporary credentials)
    ↓
Sync files to S3 bucket
    ↓
Invalidate CloudFront cache
    ↓
Live site updated globally
```

## 🛡️ Security Model

The website uses a **zero-trust architecture**:

1. S3 bucket is **completely private** (Block Public Access enabled)
2. CloudFront uses **Origin Access Control (OAC)** to access S3
3. Every request is **cryptographically signed** using AWS SigV4
4. Bucket policy restricts access to **specific CloudFront distribution only**
5. HTTPS enforced with **auto-renewing ACM certificate**
6. CI/CD uses **temporary OIDC tokens** (no stored AWS credentials)

## 🚦 Quick Start

### Prerequisites
- AWS Account
- AWS CLI configured
- Node.js 18+ and npm
- AWS CDK CLI (`npm install -g aws-cdk`)

### Deploy Infrastructure
```bash
cd resume-website-cdk
npm install
npm run build
cdk deploy --all
```

### Update Website Content
Simply push changes to the `resume-website-files/` directory on the main branch - GitHub Actions handles the rest!

## 📊 AWS Resources

**Account:** 342587863995
**Region:** us-east-1
**Domain:** cloudwithsarah.com

**Key Resources:**
- S3 Bucket: `www.cloudwithsarah.com`
- CloudFront Distribution: `EG3WGB7ERFXYG`
- Route53 Hosted Zone: `Z0935238159PZ4YC8L3ZJ`

## 📝 License

This infrastructure code and website design are © 2026 Sarah Wadley. Feel free to use the CDK patterns for inspiration, but please don't copy the website content.

---

**Built with ❤️ using AWS CDK and modern cloud architecture**
