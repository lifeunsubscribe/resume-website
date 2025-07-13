#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ResumeWebsiteCdkStack } from '../lib/resume-website-cdk-stack';
// filepath: /Users/sarahtime/Dev/resume-website/resume-website-cdk/bin/resume-website-cdk.ts
import { GitHubActionsRoleStack } from '../lib/github-actions-role-stack';

const app = new cdk.App();
new ResumeWebsiteCdkStack(app, 'ResumeWebsiteCdkStack', {
  env: { account: '342587863995', region: 'us-east-1' },
  description: 'Stack for hosting resume website on S3 with CloudFront',

});
new GitHubActionsRoleStack(app, 'GitHubActionsRoleStack', {
  env: { account: '342587863995', region: 'us-east-1' },
  description: 'CI/CD Stack for role in GitHub Actions to automatically deploy to S3',

});

// Add tags to all resources in the stack
cdk.Tags.of(app).add('Project', 'ResumeWebsite');
cdk.Tags.of(app).add('Environment', 'Production');