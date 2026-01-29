import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

export class ResumeWebsiteCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const rootDomain = 'cloudwithsarah.com';
    const wwwDomain = 'www.cloudwithsarah.com';

    // S3 Bucket for hosting the website
    const websiteBucket = new s3.Bucket(this, 'ResumeWebsiteBucket', {
      bucketName: wwwDomain,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
    });

    // ============================================================
    // REMOVED: Redirect bucket is no longer needed
    // ============================================================
    // The bucket below was configured correctly but never received traffic
    // because Route53 points to CloudFront, not to the S3 website endpoint.
    // CloudFront Functions now handle the redirect at the edge.
    // See blog post: /blog/2-buckets-1-website/
    //
    // const redirectBucket = new s3.Bucket(this, 'RedirectBucket', {
    //   bucketName: rootDomain,
    //   websiteRedirect: {
    //     hostName: wwwDomain,
    //     protocol: s3.RedirectProtocol.HTTPS
    //   },
    //   objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
    //   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    //   enforceSSL: true,
    //   publicReadAccess: false,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    // });

    // Deployment of website files to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('../resume-website-files')],
      destinationBucket: websiteBucket
    });

    // Look up hosted zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: rootDomain
    });

    // Certificate covering both root and www domains
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: rootDomain,
      subjectAlternativeNames: [wwwDomain],
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    // CFN OAC (Origin Access Control) for CloudFront to access the private S3 bucket
    const oac = new cloudfront.CfnOriginAccessControl(this, 'SiteDistributionOAC', {
      originAccessControlConfig: {
        name: 'StaticSiteOAC',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
        description: 'Access control for resume site in private S3 bucket',
      }
    });

    // Response Headers Policy for security headers
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      responseHeadersPolicyName: 'PortfolioSecurityHeaders',
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self'",
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentTypeOptions: {
          override: true,
        },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        xssProtection: {
          protection: true,
          modeBlock: true,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
            override: true,
          },
          {
            header: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
            override: true,
          },
          {
            header: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
            override: true,
          },
        ],
      },
    });

    // Cache Policy for better caching
    const cachePolicy = new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
      cachePolicyName: 'PortfolioStaticAssets',
      defaultTtl: Duration.days(1),
      maxTtl: Duration.days(365),
      minTtl: Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // CloudFront Function: Redirect non-www to www
    const wwwRedirect = new cloudfront.Function(this, 'WwwRedirectFunction', {
      functionName: 'cloudwithsarah-www-redirect',
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

    // Then create the distribution with OAC
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultRootObject: 'index.html',
      domainNames: [rootDomain, wwwDomain],
      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: responseHeadersPolicy,
        cachePolicy: cachePolicy,
        functionAssociations: [{
          function: wwwRedirect,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      certificate: certificate,
    });

    // Manually associate OAC with the distribution
    const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', oac.getAtt('Id'));

    // Route53 records
    new route53.ARecord(this, 'RootRecord', {
      zone: hostedZone,
      recordName: rootDomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
    });
    new route53.ARecord(this, 'WwwRecord', {
      zone: hostedZone,
      recordName: "www",
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
    });

    // Update bucket policy to allow OAC
    websiteBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [websiteBucket.arnForObjects('*')],
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${distribution.distributionId}`
        }
      }
    }));

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 Bucket Name',
    });
    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName
    });
    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${wwwDomain}`
    });

  }
}
