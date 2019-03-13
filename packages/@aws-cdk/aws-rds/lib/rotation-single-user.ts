import ec2 = require('@aws-cdk/aws-ec2');
import lambda = require('@aws-cdk/aws-lambda');
import secrets = require('@aws-cdk/aws-secretsmanager');
import serverless = require('@aws-cdk/aws-serverless');
import cdk = require('@aws-cdk/cdk');
import { DatabaseCluster } from './cluster';
import { DatabaseInstance, DatabaseInstanceEngine } from './instance';

/**
 * A location for a rotation single user serverless application.
 */
export class ServerlessApplicationLocation {
  public static readonly MariaDbRotationSingleUser = new ServerlessApplicationLocation('SecretsManagerRDSMariaDBRotationSingleUser', '1.0.46');
  public static readonly MysqlRotationSingleUser = new ServerlessApplicationLocation('SecretsManagerRDSMySQLRotationSingleUser', '1.0.74');
  public static readonly OracleRotationSingleUser = new ServerlessApplicationLocation('SecretsManagerRDSOracleRotationSingleUser', '1.0.45');
  public static readonly PostgresRotationSingleUser = new ServerlessApplicationLocation('SecretsManagerRDSPostgreSQLRotationSingleUser', '1.0.75');
  public static readonly SqlServerRotationSingleUser = new ServerlessApplicationLocation('SecretsManagerRDSSQLServerRotationSingleUser', '1.0.74');

  public readonly applicationId: string;
  public readonly semanticVersion: string;

  constructor(application: string, semanticVersion: string) {
    this.applicationId = `arn:aws:serverlessrepo:us-east-1:297356227824:applications/${application}`;
    this.semanticVersion = semanticVersion;
  }
}

export interface RotationSingleUserOptions {
  /**
   * Specifies the number of days after the previous rotation before
   * Secrets Manager triggers the next automatic rotation.
   *
   * @default 30 days
   */
  automaticallyAfterDays?: number;

  /**
   * The location of the serverless application for the rotation.
   *
   * @default derived from the instance engine
   */
  serverlessApplicationLocation?: ServerlessApplicationLocation
}

export interface RotationSingleUserProps extends RotationSingleUserOptions {
  /**
   * The database instance for which the master password must be rotated.
   */
  instance?: DatabaseInstance

  /**
   * The database cluster for which the master password must be rotated.
   */
  cluster?: DatabaseCluster;

  /**
   * The VPC network where the Lambda rotation function will run.
   */
  vpc: ec2.IVpcNetwork;

  /**
   * The type of subnets where the Lambda rotation function will run.
   *
   * @default private
   */
  vpcPlacement?: ec2.VpcPlacementStrategy;
}

/**
 * Single user secret rotation for an RDS instance.
 */
export class RotationSingleUser extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: RotationSingleUserProps) {
    super(scope, id);

    if (props.instance && props.cluster) {
      throw new Error('Cannot specify both `instance` and `cluster`.');
    }

    const target = props.instance || props.cluster;

    if (!target) {
      throw new Error('Either `instance` or `cluster` must be specified.');
    }

    if (!target.secret) {
      throw new Error('There is no secret associated with this instance.');
    }

    const subnets = props.vpc.subnets(props.vpcPlacement);

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc
    });

    target.connections.allowDefaultPortFrom(securityGroup);

    const rotationFunctionName = this.node.uniqueId;

    const application = new serverless.CfnApplication(this, 'Resource', {
      location: props.serverlessApplicationLocation || getApplicationLocation(target.engine),
      parameters: {
        endpoint: `https://secretsmanager.${this.node.stack.region}.${this.node.stack.urlSuffix}`,
        functionName: rotationFunctionName,
        vpcSecurityGroupIds: securityGroup.securityGroupId,
        vpcSubnetIds: subnets.map(s => s.subnetId).join(',')
      }
    });

    const permission = new lambda.CfnPermission(this, 'Permission', {
      action: 'lambda:InvokeFunction',
      functionName: rotationFunctionName,
      principal: `secretsmanager.${this.node.stack.urlSuffix}`
    });
    permission.node.addDependency(application);

    const rotationSchedule = new secrets.CfnRotationSchedule(this, 'Schedule', {
      secretId: target.secret.secretArn,
      rotationLambdaArn: this.node.stack.formatArn({
        service: 'lambda',
        resource: 'function',
        sep: ':',
        resourceName: rotationFunctionName
      }),
      rotationRules: {
        automaticallyAfterDays: props.automaticallyAfterDays || 30
      }
    });
    rotationSchedule.node.addDependency(permission);
    rotationSchedule.node.addDependency(target.available);
  }
}

/**
 * Returns the location for the rotation single user application.
 *
 * @param engine the database engine
 * @throws if the engine is not supported
 */
function getApplicationLocation(engine: string): ServerlessApplicationLocation {
  if (engine === DatabaseInstanceEngine.Aurora || /mysql/.test(engine)) {
    return ServerlessApplicationLocation.MysqlRotationSingleUser;
  }

  if (/mariadb/.test(engine)) {
    return ServerlessApplicationLocation.MariaDbRotationSingleUser;
  }

  if (/oracle/.test(engine)) {
    return ServerlessApplicationLocation.OracleRotationSingleUser;
  }

  if (/postgres/.test(engine)) {
    return ServerlessApplicationLocation.PostgresRotationSingleUser;
  }

  if (/sqlserver/.test(engine)) {
    return ServerlessApplicationLocation.SqlServerRotationSingleUser;
  }

  throw new Error(`Engine ${engine} not supported for single user rotation.`);
}
