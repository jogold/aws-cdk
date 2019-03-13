import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import kms = require('@aws-cdk/aws-kms');
import secretsmanager = require('@aws-cdk/aws-secretsmanager');
import cdk = require('@aws-cdk/cdk');
import { IDatabaseCluster } from './cluster-ref';
import { DatabaseSecret } from './database-secret';
import { Endpoint } from './endpoint';
import { IOptionGroup } from './option-group';
import { IParameterGroup } from './parameter-group';
import { CfnDBInstance, CfnDBSubnetGroup } from './rds.generated';
import { RotationSingleUser, RotationSingleUserOptions } from './rotation-single-user';

export interface IDatabaseInstance extends cdk.IConstruct, ec2.IConnectable {
  /**
   * The instance identifier.
   */
  readonly instanceIdentifier: string;

  /**
   * The instance endpoint.
   */
  readonly instanceEndpoint: Endpoint;

  /**
   * The security group identifier of the instance.
   */
  readonly securityGroupId: string;

  /**
   * A dependable that can be depended upon to force instance availability.
   */
  readonly available: cdk.IDependable;

  /**
   * Exports this instance from the stack.
   */
  export(): DatabaseInstanceImportProps;
}

/**
 * The engine for the database instance.
 */
export enum DatabaseInstanceEngine {
  Aurora = 'aurora',
  AuroraMysql = 'aurora-mysql',
  AuroraPostgresql = 'aurora-postgresql',
  MariaDb = 'mariadb',
  Mysql = 'mysql',
  OracleEE = 'oracle-ee',
  OracleSE2 = 'oracle-se2',
  OracleSE1 = 'oracle-se1',
  OracleSE = 'oracle-se',
  Postgres = 'postgres',
  SqlServerEE = 'sqlserver-ee',
  SqlServerSE = 'sqlserver-se',
  SqlServerEX = 'sqlserver-ex',
  SqlServerWeb = 'sqlserver-web'
}

/**
 * The license model.
 */
export enum LicenseModel {
  /**
   * License included.
   */
  LicenseIncluded = 'license-included',

  /**
   * Bring your own licencse.
   */
  BringYourOwnLicense = 'bring-your-own-license',

  /**
   * General public license.
   */
  GeneralPublicLicense = 'general-public-license'
}

export interface ProcessorFeatures {
  /**
   * The number of CPU core.
   */
  coreCount?: number;

  /**
   * The number of threads per core.
   */
  threadsPerCore?: number;
}

/**
 * The type of storage.
 */
export enum StorageType {
  /**
   * Standard.
   */
  Standard = 'standard',

  /**
   * General purpose (SSD).
   */
  GP2 = 'gp2',

  /**
   * Provisioned IOPS (SSD).
   */
  IO1 = 'io1'
}

/**
 * The retention period for Performance Insight.
 */
export enum PerformanceInsightRetentionPeriod {
  /**
   * Default retention period of 7 days.
   */
  Default = 7,

  /**
   * Long term retention period of 2 years.
   */
  LongTerm = 731
}

export interface DatabaseInstanceProps {
  // Engine options
  /**
   * The database engine.
   */
  engine: DatabaseInstanceEngine;

  // Instance specifications
  /**
   * The license model.
   *
   * @default RDS default license model
   */
  licenseModel?: LicenseModel;

  /**
   * The engine version. To prevent automatic upgrades, be sure to specify the
   * full version number.
   *
   * @default RDS default engine version
   */
  engineVersion?: string;

  /**
   * The name of the compute and memory capacity classes.
   */
  instanceClass: ec2.InstanceType;

  /**
   * The time zone of the instance.
   *
   * @default RDS default timezone
   */
  timezone?: string;

  /**
   * Specifies if the database instance is a multiple Availability Zone deployment.
   *
   * @default true
   */
  multiAz?: boolean;

  /**
   * The storage type.
   *
   * @default IO1
   */
  storageType?: StorageType;

  /**
   * The allocated storage size, specified in gigabytes (GB).
   *
   * @default 100
   */
  allocatedStorage?: number;

  /**
   * The number of I/O operations per second (IOPS) that the database provisions.
   * The value must be equal to or greater than 1000.
   *
   * @default 1000
   */
  iops?: number;

  /**
   * The number of CPU cores and the number of threads per core.
   *
   * @default no processor features
   */
  processorFeatures?: ProcessorFeatures;

  // Settings
  /**
   * A name for the DB instance. If you specify a name, AWS CloudFormation
   * converts it to lowercase.
   *
   * @default a CloudFormation generated name
   */
  instanceIdentifier?: string;

  /**
   * The master user name.
   *
   * @default admin or inherited from the snapshot or source instance
   */
  masterUsername?: string;

  /**
   * The master user password.
   *
   * @default inherited from the snapshot or source instance or generated
   */
  masterUserPassword?: string;

  /**
   * Whether to generate and store the master user password in AWS Secrets Manager.
   *
   * @default true if masterPassword is not specified and either snapshotIdentifier or sourceDatabaseInstance is not specified.
   */
  generateMasterUserPassword?: boolean;

  /**
   * The KMS key to use to encrypt the secret for the master user password.
   *
   * @default default master key
   */
  secretKmsKey?: kms.IEncryptionKey;

  // Network & Security
  /**
   * The VPC network where the DB subnet group should be created.
   */
  vpc: ec2.IVpcNetwork;

  /**
   * The type of subnets to add to the created DB subnet group.
   *
   * @default private
   */
  vpcPlacement?: ec2.VpcPlacementStrategy;

  /**
   * Indicates whether the DB instance is an internet-facing instance.
   *
   * @default true if vpcPlacement references public subnets
   */
  publiclyAccessible?: boolean;

  // Database options
  /**
   * The name of the database.
   *
   * @default no name or inherited from the snapshot if applicable
   */
  databaseName?: string;

  /**
   * The port for the instance.
   */
  port?: number;

  /**
   * The DB parameter group to associate with the instance.
   *
   * @default no parameter group
   */
  parameterGroup?: IParameterGroup;

  /**
   * The option group to associate with the instance.
   *
   * @default no option group
   */
  optionGroup?: IOptionGroup;

  /**
   * For supported engines, specifies the character set to associate with the
   * DB instance.
   *
   * @default RDS default character set name
   */
  characterSetName?: string;

  /**
   * Whether to enable mapping of AWS Identity and Access Management (IAM) accounts
   * to database accounts.
   *
   * @default false
   */
  enableIAMDatabaseAuthentication?: boolean;

  // Encryption
  /**
   * Indicates whether the DB instance is encrypted.
   *
   * @default true
   */
  storageEncrypted?: boolean;

  /**
   * The master key that's used to encrypt the DB instance.
   *
   * @default default master key
   */
  kmsKey?: kms.IEncryptionKey;

  // Failover
  /**
   * A value that specifies the order in which an Aurora Replica is promoted
   * to the primary instance after a failure of the existing primary instance.
   *
   * @default no preference
   */
  promotionTier?: number;

  // Backup
  /**
   * The number of days during which automatic DB snapshots are retained.
   *
   * @default 7
   */
  backupRetentionPeriod?: number;

  /**
   * The daily time range during which automated backups are performed.
   *
   * @default no preference
   */
  preferredBackupWindow?: string;

  /**
   * Indicates whether to copy all of the user-defined tags from the
   * DB instance to snapshots of the DB instance.
   *
   * @default true
   */
  copyTagsToSnapshot?: boolean;

  /**
   * Indicates whether automated backups should be deleted or retained when
   * you delete a DB instance.
   *
   * @default false
   */
  deleteAutomatedBackups?: boolean;

  // Monitoring
  /**
   * The interval, in seconds, between points when Amazon RDS collects enhanced
   * monitoring metrics for the DB instance.
   *
   * @default no enhanced monitoring
   */
  monitoringInterval?: number;

  // Performance Insights
  /**
   * Whether to enable Performance Insights for the DB instance.
   *
   * @default false
   */
  enablePerformanceInsights?: boolean;

  /**
   * The amount of time, in days, to retain Performance Insights data.
   *
   * @default 7 days
   */
  performanceInsightRetentionPeriod?: PerformanceInsightRetentionPeriod;

  /**
   * The AWS KMS key for encryption of Performance Insights data.
   *
   * @default default master key
   */
  performanceInsightKmsKey?: kms.IEncryptionKey;

  // Log exports
  /**
   * The list of log types that need to be enabled for exporting to
   * CloudWatch Logs.
   *
   * @default no log exports
   */
  cloudwatchLogsExports?: string[];

  // Maintenance
  /**
   * Indicates that minor engine upgrades are applied automatically to the
   * DB instance during the maintenance window.
   *
   * @default false
   */
  autoMinorVersionUpgrade?: boolean;

  /**
   * Whether to allow major version upgrades.
   *
   * @default false
   */
  allowMajorVersionUpgrade?: boolean;

  /**
   * The weekly time range (in UTC) during which system maintenance can occur.
   *
   * @default no preference
   */
  preferredMaintenanceWindow?: string;

  // Deletion protection
  /**
   * Indicates whether the DB instance should have deletion protection enabled.
   *
   * @default true
   */
  deletionProtection?: boolean;

  // Snapshot
  /**
   * The name or Amazon Resource Name (ARN) of the DB snapshot that's used to
   * restore the DB instance. If you're restoring from a shared manual DB snapshot,
   * you must specify the ARN of the snapshot.
   *
   * @default no snapshot
   */
  snapshotIdentifier?: string;

  // Cluster
  /**
   * An existing DB cluster to associate this instance with.
   *
   * @default no cluster
   */
  databaseCluster?: IDatabaseCluster;

  // Replica
  /**
   * The source DB instance to create a read replica from.
   *
   * @default no source instance
   */
  sourceDatabaseInstance?: IDatabaseInstance;

  /**
   * The ID of the region that contains the source DB instance for
   * the read replica.
   *
   * @default no source region
   */
  sourceRegion?: string;
}

/**
 * A database instance.
 *
 * This can be a standalone database instance, or part of a cluster.
 */
export class DatabaseInstance extends cdk.Construct implements IDatabaseInstance {
  /**
   * Import an existing database instance.
   */
  public static import(scope: cdk.Construct, id: string, props: DatabaseInstanceImportProps) {
    return new ImportedDatabaseInstance(scope, id, props);
  }

  public readonly instanceIdentifier: string;
  public readonly instanceEndpoint: Endpoint;
  public readonly securityGroupId: string;
  public readonly connections: ec2.Connections;

  /**
   * The database engine.
   */
  public readonly engine: DatabaseInstanceEngine;

  /**
   * The secret associated with this instance.
   */
  public readonly secret?: secretsmanager.ISecret;

  private readonly monitoringRole?: iam.IRole;
  private readonly vpc: ec2.IVpcNetwork;
  private readonly vpcPlacement?: ec2.VpcPlacementStrategy;

  private readonly availabilityDependencies = new cdk.ConcreteDependable();

  constructor(scope: cdk.Construct, id: string, props: DatabaseInstanceProps) {
    super(scope, id);

    if (props.databaseCluster && /aurora/.test(props.engine)) {
      throw new Error('Cannot specify `databaseCluster` when engine is not aurora.');
    }
    if (props.databaseCluster && (
      props.allocatedStorage ||
      props.backupRetentionPeriod ||
      props.characterSetName ||
      props.databaseName ||
      props.masterUsername ||
      props.masterUserPassword ||
      props.optionGroup ||
      props.preferredBackupWindow ||
      props.preferredMaintenanceWindow ||
      props.port ||
      props.sourceDatabaseInstance ||
      props.storageType ||
      props.vpc)
      ) {
        //AllocatedStorage, BackupRetentionPeriod, CharacterSetName, DBName, DBSecurityGroups, MasterUsername, MasterUserPassword, OptionGroupName, PreferredBackupWindow, PreferredMaintenanceWindow, Port, SourceDBInstanceIdentifier, StorageType, or VPCSecurityGroups
      throw new Error('Cannot specify `allocatedStorage`, `backupRetentionPeriod`, `characterSetName`, `databaseName`, `masterUsername`, `masterPassword`, `optionGroup`, `preferredBackupWindows`, `port`, `sourceDatabaseInstance` when specifying `databaseCluster`.')
    }

    this.vpc = props.vpc;
    this.vpcPlacement = props.vpcPlacement;

    const subnets = props.vpc.subnets(this.vpcPlacement);

    const availabilityZones = new Set(subnets.map(s => s.availabilityZone));

    const multiAz = props.multiAz !== undefined ? props.multiAz : true;

    if (multiAz && availabilityZones.size < 2) {
      throw new Error(`Multi AZ requires at least 2 subnets in 2 different availability zones.`);
    }

    const subnetGroup = new CfnDBSubnetGroup(this, 'SubnetGroup', {
      dbSubnetGroupDescription: `Subnet group for ${id} database`,
      subnetIds: subnets.map(s => s.subnetId)
    });

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      description: `Security group for ${id} database`,
      vpc: props.vpc
    });
    this.securityGroupId = securityGroup.securityGroupId;

    if (props.generateMasterUserPassword || (!props.masterUserPassword && (!props.snapshotIdentifier || !props.sourceDatabaseInstance))) {
      const databaseSecret = new DatabaseSecret(this, 'Secret', {
        username: props.masterUsername,
        secretKmsKey: props.secretKmsKey,
      });

      this.secret = databaseSecret.secret;
    }

    if (props.monitoringInterval) {
      this.monitoringRole = new iam.Role(this, 'MonitoringRole', {
        assumedBy: new iam.ServicePrincipal('monitoring.rds.amazonaws.com'),
        managedPolicyArns: [this.node.stack.formatArn({
          service: 'iam',
          region: '',
          account: 'aws',
          resource: 'policy',
          resourceName: 'service-role/AmazonRDSEnhancedMonitoringRole'
        })]
      });
    }

    this.engine = props.engine;

    const deletionProtection = props.deletionProtection !== undefined ? props.deletionProtection : true;
    const storageType = props.storageType || StorageType.IO1;
    const iops = storageType === StorageType.IO1 ? (props.iops || 1000) : undefined;

    const instance = new CfnDBInstance(this, 'Resource', {
      allocatedStorage: props.allocatedStorage ? props.allocatedStorage.toString() : '100',
      allowMajorVersionUpgrade: props.allowMajorVersionUpgrade,
      autoMinorVersionUpgrade: props.autoMinorVersionUpgrade || false,
      backupRetentionPeriod: props.backupRetentionPeriod ? props.backupRetentionPeriod.toString() : '7',
      characterSetName: props.characterSetName,
      copyTagsToSnapshot: props.copyTagsToSnapshot !== undefined ? props.copyTagsToSnapshot : true,
      dbClusterIdentifier: props.databaseCluster && props.databaseCluster.clusterIdentifier,
      dbInstanceClass: `db.${props.instanceClass}`,
      dbInstanceIdentifier: props.instanceIdentifier,
      dbName: props.databaseName,
      dbParameterGroupName: props.parameterGroup && props.parameterGroup.parameterGroupName,
      dbSnapshotIdentifier: props.snapshotIdentifier,
      dbSubnetGroupName: subnetGroup.dbSubnetGroupName,
      deleteAutomatedBackups: props.deleteAutomatedBackups || false,
      deletionProtection,
      enableCloudwatchLogsExports: props.cloudwatchLogsExports,
      enableIamDatabaseAuthentication: props.enableIAMDatabaseAuthentication,
      enablePerformanceInsights: props.enablePerformanceInsights,
      engine: props.databaseCluster ? DatabaseInstanceEngine.Aurora : props.engine,
      engineVersion: props.engineVersion,
      iops,
      kmsKeyId: props.kmsKey && props.kmsKey.keyArn,
      licenseModel: props.licenseModel,
      masterUsername: this.secret ? this.secret.jsonFieldValue('username') : props.masterUsername,
      masterUserPassword: this.secret ? this.secret.jsonFieldValue('password') : props.masterUserPassword,
      monitoringInterval: props.monitoringInterval,
      monitoringRoleArn: this.monitoringRole && this.monitoringRole.roleArn,
      multiAz,
      optionGroupName: props.optionGroup && props.optionGroup.optionGroupName,
      performanceInsightsKmsKeyId: props.enablePerformanceInsights
        ? props.performanceInsightKmsKey && props.performanceInsightKmsKey.keyArn
        : undefined,
      performanceInsightsRetentionPeriod: props.enablePerformanceInsights
        ? (props.performanceInsightRetentionPeriod || PerformanceInsightRetentionPeriod.Default)
        : undefined,
      port: props.port ? props.port.toString() : undefined,
      preferredBackupWindow: props.preferredBackupWindow,
      preferredMaintenanceWindow: props.preferredMaintenanceWindow,
      processorFeatures: props.processorFeatures && renderProcessorFeatures(props.processorFeatures),
      promotionTier: props.promotionTier,
      publiclyAccessible: props.publiclyAccessible,
      sourceDbInstanceIdentifier: props.sourceDatabaseInstance && props.sourceDatabaseInstance.instanceIdentifier,
      sourceRegion: props.sourceRegion,
      storageEncrypted: props.storageEncrypted !== undefined ? props.storageEncrypted : true,
      storageType,
      timezone: props.timezone,
      vpcSecurityGroups: [this.securityGroupId]
    });

    // When deletion protection is enabled CloudFormation cannot delete the instance
    cdk.applyRemovalPolicy(instance, deletionProtection ? cdk.RemovalPolicy.Orphan : undefined);

    this.availabilityDependencies.add(instance);

    this.instanceIdentifier = instance.dbInstanceId;
    this.instanceEndpoint = new Endpoint(instance.dbInstanceEndpointAddress, instance.dbInstanceEndpointPort);

    if (this.secret) {
      const secretAttachement = new secretsmanager.CfnSecretTargetAttachment(this, 'SecretAttachement', {
        secretId: this.secret.secretArn,
        targetId: instance.dbInstanceId,
        targetType: 'AWS::RDS::DBInstance'
      });

      this.availabilityDependencies.add(secretAttachement);
    }

    this.connections = new ec2.Connections({
      securityGroups: [securityGroup],
      defaultPortRange: new ec2.TcpPortFromAttribute(instance.dbInstanceEndpointPort)
    });
  }

  public get available(): cdk.IDependable {
    return this.availabilityDependencies;
  }

  public addMasterPasswordRotation(id: string, options?: RotationSingleUserOptions): void {
    new RotationSingleUser(this, id, {
      instance: this,
      vpc: this.vpc,
      vpcPlacement: this.vpcPlacement,
      ...options
    });
  }

  public export(): DatabaseInstanceImportProps {
    return {
      instanceIdentifier: new cdk.CfnOutput(this, 'InstanceId', { value: this.instanceIdentifier }).makeImportValue().toString(),
      endpointAddress: new cdk.CfnOutput(this, 'EndpointAddress', { value: this.instanceEndpoint.hostname }).makeImportValue().toString(),
      port: new cdk.CfnOutput(this, 'Port', { value: this.instanceEndpoint.port }).makeImportValue().toString(),
      securityGroupId: new cdk.CfnOutput(this, 'SecurityGroupId', { value: this.securityGroupId, }).makeImportValue().toString()
    };
  }
}

export interface DatabaseInstanceImportProps {
  /**
   * The instance identifier.
   */
  instanceIdentifier: string;

  /**
   * The endpoint address.
   */
  endpointAddress: string;

  /**
   * The database port.
   */
  port: string;

  /**
   * The security group identifier of the instance.
   */
  securityGroupId: string;
}

/**
 * An imported database instance.
 */
export class ImportedDatabaseInstance extends cdk.Construct implements IDatabaseInstance {
  public readonly instanceIdentifier: string;
  public readonly instanceEndpoint: Endpoint;
  public readonly securityGroupId: string;
  public readonly available: cdk.IDependable = new cdk.ConcreteDependable();
  public readonly connections: ec2.Connections;

  constructor(scope: cdk.Construct, id: string, private readonly props: DatabaseInstanceImportProps) {
    super(scope, id);

    this.instanceIdentifier = props.instanceIdentifier;
    this.instanceEndpoint = new Endpoint(props.endpointAddress, props.port);
    this.securityGroupId = props.securityGroupId;
    this.connections = new ec2.Connections({
      securityGroups: [ec2.SecurityGroup.import(this, 'SecurityGroup', { securityGroupId: props.securityGroupId })],
      defaultPortRange: new ec2.TcpPortFromAttribute(props.port)
    });
  }

  public export() {
    return this.props;
  }
}

/**
 * Renders the processor features specifications
 *
 * @param features the processor features
 */
function renderProcessorFeatures(features: ProcessorFeatures): CfnDBInstance.ProcessorFeatureProperty[] | undefined {
  const featuresList = Object.entries(features).map(([name, value]) => ({ name, value: value.toString() }));

  return featuresList.length === 0 ? undefined : featuresList;
}
