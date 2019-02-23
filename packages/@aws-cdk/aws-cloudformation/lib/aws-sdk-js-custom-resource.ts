import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import path = require('path');
import { CustomResource } from './custom-resource';

export interface AwsSdkCall {
  /**
   * The service to call
   */
  service: string;

  /**
   * The service action to call
   */
  action: string;

  /**
   * The parameters for the service action
   */
  parameters: any;
}

export interface AwsSdkJsCustomResourceProps {
  /**
   * The AWS SDK call to make when the resource is created
   *
   * @default the call when the resource is updated
   */
  onCreate?: AwsSdkCall;

  /**
   * The AWS SDK call to make when the resource is updated
   *
   * @default the call when the resource is created
   */
  onUpdate?: AwsSdkCall;

  /**
   * THe AWS SDK call to make when the resource is deleted
   */
  onDelete?: AwsSdkCall;

  /**
   * The IAM policy statement for the lambda provider.
   * It must give the right permissions for the different calls.
   */
  policyStatement: iam.PolicyStatement;
}

export class AwsSdkJsCustomResource extends cdk.Construct {
  /**
   * The lambda provider.
   */
  public readonly lambda: lambda.SingletonFunction;

  /**
   * The custom resource.
   */
  public readonly resource: CustomResource;

  constructor(scope: cdk.Construct, id: string, props: AwsSdkJsCustomResourceProps) {
    super(scope, id);

    if (!props.onCreate && !props.onUpdate && !props.onDelete) {
      throw new Error('At least `onCreate`, `onUpdate` or `onDelete` must be specified.');
    }

    this.lambda = new lambda.SingletonFunction(this, 'Function', {
      code: lambda.Code.asset(path.join(__dirname, 'aws-sdk-js-caller')),
      runtime: lambda.Runtime.NodeJS810,
      handler: 'index.handler',
      uuid: '679f53fa-c002-430c-b0da-5b7982bd2287'
    });

    // TODO: can we derive this from the calls?
    this.lambda.addToRolePolicy(props.policyStatement);

    this.resource = new CustomResource(this, 'Resource', {
      lambdaProvider: this.lambda,
      properties: {
        create: props.onCreate || props.onUpdate,
        update: props.onUpdate || props.onCreate,
        delete: props.onDelete
      }
    });
  }
}
