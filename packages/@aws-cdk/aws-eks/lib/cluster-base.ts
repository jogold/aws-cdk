import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/cdk');

/**
 * An EKS cluster
 */
export interface ICluster extends cdk.IConstruct, ec2.IConnectable {
  /**
   * The physical name of the Cluster
   */
  readonly clusterName: string;

  /**
   * The unique ARN assigned to the service by AWS
   * in the form of arn:aws:eks:
   */
  readonly clusterArn: string;

  /**
   * The API Server endpoint URL
   */
  readonly clusterEndpoint: string;
}

/**
 * A SecurityGroup Reference, object not created with this template.
 */
export abstract class ClusterBase extends cdk.Construct implements ICluster {
  public abstract readonly clusterName: string;
  public abstract readonly clusterArn: string;
  public abstract readonly clusterEndpoint: string;
  public abstract readonly vpcPlacement: ec2.VpcPlacementStrategy;
  public abstract readonly securityGroupId: string;
  public abstract readonly connections: ec2.Connections;

  /**
   * Export cluster references to use in other stacks
   */
  public export(): ClusterImportProps {
    return {
      clusterName: this.makeOutput('ClusterName', this.clusterName),
      clusterArn: this.makeOutput('ClusterArn', this.clusterArn),
      clusterEndpoint: this.makeOutput('ClusterEndpoint', this.clusterEndpoint),
      vpcPlacement: this.vpcPlacement,
      securityGroupId: this.securityGroupId,
      connections: this.connections,
    };
  }

  private makeOutput(name: string, value: any): string {
    return new cdk.Output(this, name, { value }).makeImportValue().toString();
  }
}
