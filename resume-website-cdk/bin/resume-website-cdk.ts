#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ResumeWebsiteCdkStack } from '../lib/resume-website-cdk-stack';

const app = new cdk.App();
new ResumeWebsiteCdkStack(app, 'ResumeWebsiteCdkStack', {

  env: { account: '342587863995', region: 'us-east-1' },
  description: 'Stack for hosting resume website on S3 with CloudFront',

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

// Add tags to all resources in the stack
cdk.Tags.of(app).add('Project', 'ResumeWebsite');
cdk.Tags.of(app).add('Environment', 'Production');