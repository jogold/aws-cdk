import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/cdk');
import { Endpoint } from './endpoint';

/**
 * Create a clustered database with a given number of instances.
 */
export interface IDatabaseCluster extends cdk.IConstruct, ec2.IConnectable {
  /**
   * Identifier of the cluster
   */
  readonly clusterIdentifier: string;

  /**
   * Identifiers of the replicas
   */
  readonly instanceIdentifiers: string[];

  /**
   * The endpoint to use for read/write operations
   */
  readonly clusterEndpoint: Endpoint;

  /**
   * Endpoint to use for load-balanced read-only operations.
   */
  readonly readerEndpoint: Endpoint;

  /**
   * Endpoints which address each individual replica.
   */
  readonly instanceEndpoints: Endpoint[];

  /**
   * The security group for this database cluster
   */
  readonly securityGroupId: string;

  /**
   * A dependable that can be depended upon to force cluster availability.
   */
  readonly available: cdk.IDependable;

  /**
   * Export a Database Cluster for importing in another stack
   */
  export(): DatabaseClusterImportProps;
}

/**
 * Properties that describe an existing cluster instance
 */
export interface DatabaseClusterImportProps {
  /**
   * The database port
   */
  port: string;

  /**
   * The security group for this database cluster
   */
  securityGroupId: string;

  /**
   * Identifier for the cluster
   */
  clusterIdentifier: string;

  /**
   * Identifier for the instances
   */
  instanceIdentifiers: string[];
  // Actual underlying type: DBInstanceId[], but we have to type it more loosely for Java's benefit.

  /**
   * Cluster endpoint address
   */
  clusterEndpointAddress: string;

  /**
   * Reader endpoint address
   */
  readerEndpointAddress: string;

  /**
   * Endpoint addresses of individual instances
   */
  instanceEndpointAddresses: string[];
}
