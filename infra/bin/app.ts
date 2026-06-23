#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CineaiStack } from '../lib/cineai-stack';

const app = new cdk.App();

new CineaiStack(app, 'CineaiStack', {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  tmdbApiKey:      process.env.TMDB_API_KEY      ?? '',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region:  process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});
