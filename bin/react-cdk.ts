#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ReactCdkStack } from '../lib/react-cdk-stack';

const app = new cdk.App();
new ReactCdkStack(app, 'ReactCdkStack', {
  env: { account: '123456789012', region: 'eu-west-1' },
});
