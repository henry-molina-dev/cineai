import * as path from 'path';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { HttpApi, HttpMethod, CorsHttpMethod, DomainName } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

const BACKEND_DIR = path.join(__dirname, '../../..', 'backend');
const SHARED_SRC  = path.join(BACKEND_DIR, 'shared/src');
const API_DOMAIN  = 'cineai-api.henry-molina.dev';

interface ApiProps {
  table:           Table;
  anthropicApiKey: string;
  tmdbApiKey:      string;
  zone:            IHostedZone;
  certificate:     ICertificate;
}

export class Api extends Construct {
  readonly httpApi:    HttpApi;
  readonly sessionFn:  NodejsFunction;
  readonly moviesFn:   NodejsFunction;
  readonly chatFn:     NodejsFunction;
  readonly domainName: string = API_DOMAIN;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const { table, anthropicApiKey, tmdbApiKey, zone, certificate } = props;

    const sharedEnv = {
      DYNAMODB_TABLE_NAME: table.tableName,
      ANTHROPIC_API_KEY:   anthropicApiKey,
      TMDB_API_KEY:        tmdbApiKey,
      LOG_LEVEL:           'INFO',
    };

    const bundling = {
      alias:           { '@cineai/shared': SHARED_SRC },
      externalModules: ['@aws-sdk/*'],
      tsconfig:        path.join(BACKEND_DIR, 'tsconfig.json'),
    };

    const logGroup = (id: string) => new LogGroup(this, id, {
      retention:     RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.sessionFn = new NodejsFunction(this, 'SessionFn', {
      entry:       path.join(BACKEND_DIR, 'session/handler.ts'),
      runtime:     Runtime.NODEJS_22_X,
      timeout:     Duration.seconds(10),
      memorySize:  256,
      environment: sharedEnv,
      logGroup:    logGroup('SessionLogs'),
      bundling,
    });

    this.moviesFn = new NodejsFunction(this, 'MoviesFn', {
      entry:       path.join(BACKEND_DIR, 'movies/handler.ts'),
      runtime:     Runtime.NODEJS_22_X,
      timeout:     Duration.seconds(10),
      memorySize:  256,
      environment: sharedEnv,
      logGroup:    logGroup('MoviesLogs'),
      bundling,
    });

    this.chatFn = new NodejsFunction(this, 'ChatFn', {
      entry:       path.join(BACKEND_DIR, 'chat/handler.ts'),
      runtime:     Runtime.NODEJS_22_X,
      timeout:     Duration.seconds(30),
      memorySize:  256,
      environment: sharedEnv,
      logGroup:    logGroup('ChatLogs'),
      bundling,
    });

    const domainName = new DomainName(this, 'ApiDomainName', {
      domainName: API_DOMAIN,
      certificate,
    });

    this.httpApi = new HttpApi(this, 'HttpApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.PATCH, CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type'],
      },
      defaultDomainMapping: { domainName },
    });

    new ARecord(this, 'ApiAliasRecord', {
      zone,
      recordName: 'cineai-api',
      target: RecordTarget.fromAlias(
        new ApiGatewayv2DomainProperties(domainName.regionalDomainName, domainName.regionalHostedZoneId),
      ),
    });

    this.httpApi.addRoutes({
      path:        '/session',
      methods:     [HttpMethod.GET, HttpMethod.PATCH],
      integration: new HttpLambdaIntegration('SessionIntegration', this.sessionFn),
    });

    this.httpApi.addRoutes({
      path:        '/movies',
      methods:     [HttpMethod.GET],
      integration: new HttpLambdaIntegration('MoviesIntegration', this.moviesFn),
    });

    this.httpApi.addRoutes({
      path:        '/chat',
      methods:     [HttpMethod.POST],
      integration: new HttpLambdaIntegration('ChatIntegration', this.chatFn),
    });
  }
}
