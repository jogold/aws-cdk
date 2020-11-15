import * as ec2 from '@aws-cdk/aws-ec2';
import * as kms from '@aws-cdk/aws-kms';
import { IResource, Resource, Size } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { CfnReplicationInstance } from './dms.generated';
import { ISubnetGroup, SubnetGroup } from './subnet-group';

const IDENTIFIER_REGEX = /^(?![\-0-9])(?!.*--)[A-Za-z0-9-]{1,63}(?<!-)$/;

/**
 * A DMS replication instance
 */
export interface IReplicationInstance extends IResource, ec2.IConnectable {
  /**
   * The Amazon Resource Name (ARN) of the replication instance
   *
   * @attribute
   */
  readonly replicationInstanceArn: string;
}

/**
 * Properties for a DMS replication instnace
 */
export interface ReplicationInstanceProps {
  /**
   * The amount of storage (in gigabytes) to be initially allocated for the
   * replication instance.
   *
   * @default Size.gibibytes(50)
   */
  readonly allocatedStorage?: Size;

  /**
   * Indicates that major version upgrades are allowed. Changing this parameter
   * does not result in an outage, and the change is asynchronously applied as
   * soon as possible.
   *
   * This parameter must be set to true when specifying a value for the
   * `engineVersion` parameter that is a different major version than the
   * replication instance's current version.
   *
   * @default false
   */
  readonly allowMajorVersionUpgrade?: boolean;

  /**
   * A value that indicates whether minor engine upgrades are applied
   * automatically to the replication instance during the maintenance window.
   *
   *
   * @default true
   */
  readonly autoMinorVersionUpgrade?: boolean;

  /**
   * The Availability Zone that the replication instance will be created in.
   *
   * You can't set the `availabilityZone` if `multiAz` is set to `true`.
   *
   * @default - a random, system-chosen Availability Zone
   */
  readonly availabilityZone?: string;

  /**
   * The engine version number of the replication instance.
   *
   * @default - latest engine version available
   */
  readonly engineVersion?: string;

  /**
   * An AWS KMS key ithat is used to encrypt the data on the replication instance.
   *
   * @default - default encryption key
   */
  readonly encryptionKey?: kms.IKey

  /**
   * Specifies whether the replication instance is a Multi-AZ deployment.
   *
   * You can't set the `availabilityZone` if `multiAz` is set to `true`.
   *
   * @default false
   */
  readonly mutliAz?: boolean;

  /**
   * The weekly time range during which system maintenance can occur,
   * in Universal Coordinated Time (UTC).
   *
   * Format: `ddd:hh24:mi-ddd:hh24:mi´
   * Constraints: Minimum 30-minute window.
   *
   * @default - A 30-minute window selected at random from an 8-hour block
   * of time per AWS Region, occurring on a random day of the week.
   */
  readonly preferredMaintenanceWindow?: string;

  /**
   * Specifies the accessibility options for the replication instance. A value
   * of `true` represents an instance with a public IP address. A value of
   * `false` represents an instance with a private IP address.
   *
   * @default false
   */
  readonly publiclyAccessible?: boolean;

  /**
   * The compute and memory capacity of the replication instance
   *
   * @see https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.Types.html
   *
   * @default - t2.medium (or, more specifically, dms.t2.medium)
   */
  readonly instanceType?: ec2.InstanceType;

  /**
   * The replication instance identifier. This parameter is stored as a lowercase
   * string.
   *
   * @default - a AWS DMS generated identifier
   */
  readonly instanceIdentifier?: string;

  /**
   * The VPC network where the replication instance should be created
   */
  readonly vpc: ec2.IVpc;

  /**
   * The type of subnets where the replication instance should be created
   *
   * @default - the Vpc default strategy
   */
  readonly vpcSubnets?: ec2.SubnetSelection;

  /**
   * Existing subnet group for the replication instance.
   *
   * @default - a new subnet group will be created.
   */
  readonly subnetGroup?: ISubnetGroup;

  /**
   * The security groups to assign to the replication instance.
   *
   * @default - a new security group is created
   */
  readonly securityGroups?: ec2.ISecurityGroup[];
}

/**
 * Attributes to import an existing replication instance
 */
export interface ReplicationInstanceAttributes {
  /**
   * The Amazon Resource Name (ARN) of the replication instance
   */
  readonly replicationInstanceArn: string;

  /**
   * The security groups of the replication instance.
   */
  readonly securityGroups: ec2.ISecurityGroup[];
}

/**
 * A DMS replication instance
 */
export class ReplicationInstance extends Resource implements IReplicationInstance {
  /**
   * Import an existing replication instance
   */
  public static fromReplicationInstanceAttributes(scope: Construct, id: string, attrs: ReplicationInstanceAttributes): IReplicationInstance {
    class Import extends Resource implements IReplicationInstance {
      public readonly replicationInstanceArn = attrs.replicationInstanceArn;
      public readonly connections = new ec2.Connections({ securityGroups: attrs.securityGroups });
    }
    return new Import(scope, id);
  }

  public readonly replicationInstanceArn: string;

  /**
   * Access to network connections
   */
  public readonly connections: ec2.Connections;

  /**
   * Private IP addresses for the replication instance
   *
   * @attribute ReplicationInstancePrivateIpAddresses
   */
  public readonly privateIpAddresses: string[];

  /**
   * Public IP addresses for the replication instance
   *
   * @attribute ReplicationInstancePublicIpAddresses
   */
  public readonly publicIpAddresses: string[];

  constructor(scope: Construct, id: string, props: ReplicationInstanceProps) {
    super(scope, id);

    if (props.mutliAz && props.availabilityZone) {
      throw new Error('Can set `availabilityZone` when `multiAz` is set to `true`');
    }

    if (props.instanceIdentifier && !IDENTIFIER_REGEX.test(props.instanceIdentifier)) {
      throw new Error('Identifier must begin with a letter and must contain only ASCII letters, digits, and hyphens. They can\'t end with a hyphen or contain two consecutive hyphens. Maximum length is 63.');
    }

    const instanceType = props.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MEDIUM);
    const subnetGroup = props.subnetGroup ?? new SubnetGroup(this, 'SubnetGroup', {
      description: `Subnet group for ${this.node.id} replication instance`,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
    });
    const securityGroups = props.securityGroups ?? [new ec2.SecurityGroup(this, 'SecurityGroup', {
      description: `Security group for ${this.node.id} replication instance`,
      vpc: props.vpc,
    })];
    this.connections = new ec2.Connections({ securityGroups });

    const instance = new CfnReplicationInstance(this, 'Resource', {
      allocatedStorage: props.allocatedStorage?.toGibibytes(),
      allowMajorVersionUpgrade: props.allowMajorVersionUpgrade,
      autoMinorVersionUpgrade: props.autoMinorVersionUpgrade,
      availabilityZone: props.availabilityZone,
      engineVersion: props.engineVersion,
      kmsKeyId: props.encryptionKey?.keyId,
      multiAz: props.mutliAz,
      preferredMaintenanceWindow: props.preferredMaintenanceWindow,
      publiclyAccessible: props.publiclyAccessible ?? false,
      replicationInstanceClass: instanceType.toString(),
      replicationInstanceIdentifier: props.instanceIdentifier,
      replicationSubnetGroupIdentifier: subnetGroup.subnetGroupName,
      vpcSecurityGroupIds: securityGroups.map(sg => sg.securityGroupId),
    });

    this.replicationInstanceArn = instance.ref;
    this.privateIpAddresses = instance.attrReplicationInstancePrivateIpAddresses,
    this.publicIpAddresses = instance.attrReplicationInstancePublicIpAddresses;
  }
}
