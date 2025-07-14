import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export class GitHubActionsRoleStack extends cdk.Stack {
    public readonly githubActionsRole: iam.Role;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Your S3 bucket (replace with your actual bucket ARN)
        const resumeBucket = s3.Bucket.fromBucketArn(
            this,
            'ResumeBucket',
            'arn:aws:s3:::www.cloudwithsarah.com'
        );

        // OIDC provider for GitHub Actions
        const githubOidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
            url: 'https://token.actions.githubusercontent.com',
            clientIds: ['sts.amazonaws.com'], // GitHub uses this to authenticate
            thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'], // GitHub's OIDC thumbprint
        });

        // IAM Role for GitHub Actions
        this.githubActionsRole = new iam.Role(this, 'GitHubActionsRole', {
            assumedBy: new iam.WebIdentityPrincipal(
                githubOidcProvider.openIdConnectProviderArn,
                {
                    StringEquals: {
                        'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                    },
                    StringLike: {
                        // Restrict to your GitHub repo (format: repo:org/repo:ref)
                        'token.actions.githubusercontent.com:sub': [
                            'repo:lifeunsubscribe/resume-website:*',            // All branches/tags
                            'repo:lifeunsubscribe/resume-website:pull_request', // PRs
                        ],
                    },
                }
            ),
            description: 'Role assumed by GitHub Actions for S3 deployments',
        });

        // Grant S3 deployment permissions
        resumeBucket.grantReadWrite(this.githubActionsRole);

        // Look up your existing CloudFront distribution
        const distribution = cloudfront.Distribution.fromDistributionAttributes(this, 'ResumeDistribution', {
            distributionId: 'EG3WGB7ERFXYG',
            domainName: 'cloudwithsarah.com',
        });

        // Optional: Add CloudFront invalidation permissions
        this.githubActionsRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['cloudfront:CreateInvalidation'],
                resources: [`arn:aws:cloudfront::342587863995:distribution/${distribution.distributionId}`],
            })
        );

        // Output the Role ARN for GitHub Secrets
        new cdk.CfnOutput(this, 'GitHubActionsRoleArn', {
            value: this.githubActionsRole.roleArn,
        });
    }
}