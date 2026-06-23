import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Database } from './constructs/database';
import { Api } from './constructs/api';
import { Frontend } from './constructs/frontend';
import { Observability } from './constructs/observability';

interface CineaiStackProps extends StackProps {
  anthropicApiKey: string;
  tmdbApiKey:      string;
}

export class CineaiStack extends Stack {
  constructor(scope: Construct, id: string, props: CineaiStackProps) {
    super(scope, id, props);

    const { anthropicApiKey, tmdbApiKey } = props;

    const database = new Database(this, 'Database');
    const frontend = new Frontend(this, 'Frontend');

    const api = new Api(this, 'Api', {
      table: database.table,
      anthropicApiKey,
      tmdbApiKey,
      zone:        frontend.zone,
      certificate: frontend.certificate,
    });

    // session and chat read + write (update requestCount, history, mood, etc.)
    database.table.grantReadWriteData(api.sessionFn);
    database.table.grantReadWriteData(api.chatFn);
    // movies only reads (validateToken middleware)
    database.table.grantReadData(api.moviesFn);

    new Observability(this, 'Observability');

    new CfnOutput(this, 'ApiUrl', {
      description: 'HTTP API custom domain — set as VITE_API_URL for the frontend build',
      value:       `https://${api.domainName}/`,
    });

    new CfnOutput(this, 'DistributionUrl', {
      description: 'Custom domain URL — set as BASE_URL for generate-token',
      value:       `https://${frontend.domainName}`,
    });

    new CfnOutput(this, 'PortfolioUrl', {
      description: 'Portfolio landing page URL',
      value:       `https://${frontend.portfolioDomainName}`,
    });

    new CfnOutput(this, 'PortfolioBucketName', {
      description: 'S3 bucket for the portfolio landing page',
      value:       frontend.portfolioBucket.bucketName,
    });
  }
}
