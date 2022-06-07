import { Construct } from 'constructs';
import { DockerImage, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

export class ReactCdkStack extends Stack {
  public readonly zoneName = 'your-domain-here.com';

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const applicationBucket = new s3.Bucket(this, 'ApplicationBucket', {
      autoDeleteObjects: true,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new s3deploy.BucketDeployment(this, 'DeployApplication', {
      destinationBucket: applicationBucket,
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../app'), {
          bundling: {
            image: new DockerImage('node:14-alpine'),
            command: [
              // See Docker reference on how to specify a run command.
              '/bin/sh',
              '-c',
              'npm ci && npm run build && mv build/* /asset-output/',
            ],
          },
        }),
      ],
    });

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'HostedZone',
      {
        zoneName: this.zoneName,
        hostedZoneId: 'RANDOMZONEIDHERE', // Once you've added a route53 hosted zone, copy the ID in here
      }
    );

    const certificate = new certificatemanager.DnsValidatedCertificate(
      this,
      'Certificate',
      {
        domainName: this.zoneName,
        hostedZone,
        region: 'us-east-1', // This is here for a reason! Global resources must have their certificates in us-east-1
      }
    );

    const distribution = new cloudfront.Distribution(
      this,
      'WebsiteDistribution',
      {
        defaultRootObject: 'index.html',
        defaultBehavior: {
          origin: new origins.S3Origin(applicationBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        domainNames: [this.zoneName],
        certificate,
      }
    );

    new route53.ARecord(this, 'WebsiteRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });
    new route53.AaaaRecord(this, 'WebsiteRecordv6', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });
  }
}
