import { RemovalPolicy } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import {
  AllowedMethods,
  Distribution,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, HostedZone, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

const ZONE_NAME        = 'henry-molina.dev';
const CINEAI_DOMAIN    = 'cineai.henry-molina.dev';
const PORTFOLIO_DOMAIN = 'henry-molina.dev';

export class Frontend extends Construct {
  readonly bucket:                Bucket;
  readonly distribution:          Distribution;
  readonly portfolioBucket:       Bucket;
  readonly portfolioDistribution: Distribution;
  readonly domainName          = CINEAI_DOMAIN;
  readonly portfolioDomainName = PORTFOLIO_DOMAIN;
  readonly zone:                IHostedZone;
  readonly certificate:         ICertificate;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.bucket = new Bucket(this, 'Bucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy:     RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.portfolioBucket = new Bucket(this, 'PortfolioBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy:     RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const zone = HostedZone.fromLookup(this, 'Zone', { domainName: ZONE_NAME });
    this.zone = zone;

    // One certificate covering the apex and all subdomains
    const certificate = new Certificate(this, 'Certificate', {
      domainName:              PORTFOLIO_DOMAIN,
      subjectAlternativeNames: [`*.${ZONE_NAME}`],
      validation:              CertificateValidation.fromDns(zone),
    });
    this.certificate = certificate;

    // CineAI app — cineai.henry-molina.dev
    this.distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin:               S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods:       AllowedMethods.ALLOW_GET_HEAD,
      },
      defaultRootObject: 'index.html',
      domainNames:       [CINEAI_DOMAIN],
      certificate,
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    new ARecord(this, 'AliasRecord', {
      zone,
      recordName: 'cineai',
      target:     RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
    });

    // Portfolio landing page — henry-molina.dev
    this.portfolioDistribution = new Distribution(this, 'PortfolioDistribution', {
      defaultBehavior: {
        origin:               S3BucketOrigin.withOriginAccessControl(this.portfolioBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods:       AllowedMethods.ALLOW_GET_HEAD,
      },
      defaultRootObject: 'index.html',
      domainNames:       [PORTFOLIO_DOMAIN],
      certificate,
    });

    new ARecord(this, 'PortfolioAliasRecord', {
      zone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.portfolioDistribution)),
    });
  }
}
