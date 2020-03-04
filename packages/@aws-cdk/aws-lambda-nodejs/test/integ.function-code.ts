/* tslint:disable no-console */
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import got from 'got';
import * as lambda from '../lib';
import { add, mult } from './math';

class TestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new lambda.NodejsCodeFunction(this, 'WithDeps', {
      handler: async (event: { a: number, b: number }) => {
        // Use local dependencies
        console.log(mult(event.a, event.b));
        console.log(add(event.a, event.b));

        // Use external dependency
        const body = await got('https://aws.amazon.com', {
          resolveBodyOnly: true
        });
        console.log(body);
      },
      includes: ['got'], // Do not bundle 'got'
      installInDocker: true, // Install it in a docker container
    });
  }
}

const app = new App();
new TestStack(app, 'cdk-integ-lambda-nodejs-from-code');
app.synth();
