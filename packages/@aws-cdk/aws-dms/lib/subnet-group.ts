import * as ec2 from '@aws-cdk/aws-ec2';
import { IResource, Resource } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { CfnReplicationSubnetGroup } from './dms.generated';

/**
 * A DMS replication subnet group
 */
export interface ISubnetGroup extends IResource {
  /**
   * The name of the replication subnet group.
   *
   * @attribute
   */
  readonly subnetGroupName: string;
}

/**
 * Properties for a SubnetGroup
 */
export interface SubnetGroupProps {
  /**
   * Description of the subnet group.
   */
  readonly description: string;

  /**
   * The VPC to place the subnet group in.
   */
  readonly vpc: ec2.IVpc;

  /**
   * The name of the subnet group.
   *
   * @default - a name is generated
   */
  readonly subnetGroupName?: string;

  /**
   * Which subnets within the VPC to associate with this group.
   *
   * @default - the Vpc default strategy
   */
  readonly vpcSubnets?: ec2.SubnetSelection;
}

/**
 * A DMS replication subnet group
 *
 * @resource AWS::DMS::ReplicationSubnetGroup
 */
export class SubnetGroup extends Resource implements ISubnetGroup {

  /**
   * Imports an existing replication subnet group by name.
   */
  public static fromSubnetGroupName(scope: Construct, id: string, subnetGroupName: string): ISubnetGroup {
    class Import extends Resource implements ISubnetGroup {
      public readonly subnetGroupName = subnetGroupName;
    }
    return new Import(scope, id);
  }

  public readonly subnetGroupName: string;

  constructor(scope: Construct, id: string, props: SubnetGroupProps) {
    super(scope, id);

    const { subnetIds } = props.vpc.selectSubnets(props.vpcSubnets ?? { subnetType: ec2.SubnetType.PRIVATE });

    const subnetGroup = new CfnReplicationSubnetGroup(this, 'Resource', {
      replicationSubnetGroupDescription: props.description,
      replicationSubnetGroupIdentifier: props.subnetGroupName,
      subnetIds,
    });

    this.subnetGroupName = subnetGroup.ref;
  }
}
