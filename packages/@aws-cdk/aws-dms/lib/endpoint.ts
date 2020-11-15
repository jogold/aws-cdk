import * as kms from '@aws-cdk/aws-kms';
import { IResource, Resource } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { ICertificate } from './certificate';
import { CfnEndpoint, CfnEndpointProps } from './dms.generated';

/**
 * A DMS source endpoint
 */
export interface ISourceEndpoint extends IResource {
  /**
   * The Amazon Resource Name (ARN) of the endpoint
   *
   * @attribute
   */
  readonly sourceEndpointArn: string;
}

/**
 * A DMS target endpoint
 */
export interface ITargetEndpoint extends IResource {
  /**
   * The Amazon Resource Name (ARN) of the endpoint
   *
   * @attribute
   */
  readonly targetEndpointArn: string;
}

/**
 * Options for a DMS endpoint
 */
export interface EndpointBaseOptions {
  /**
   * The endpoint identifier
   *
   * @default - a DMS generated identifier
   */
  readonly endpointIdentifier?: string;
}

/**
 * Options for a DMS endpoint
 */
export interface EndpointOptions extends EndpointBaseOptions {
  /**
   * The engine of the endpoint
   */
  readonly engineName: string;
}

/**
 * Properties for a DMS endpoint
 */
export interface EndpointProps extends EndpointOptions {
  /**
   * The type of endpoint
   */
  readonly endpointType: EndpointType;
}

/**
 * The type of endpoint
 */
export enum EndpointType {
  /**
   * Source
   */
  SOURCE = 'source',

  /**
   * Success
   */
  TARGET = 'target',
}

type AdditionalProps = Omit<CfnEndpointProps, 'endpointType'|'engineName'>;

/**
 * A DMS endpoint
 */
abstract class Endpoint extends Resource {
  /**
   * A value that can be used for cross-account validation.
   */
  public readonly endpointExternalId: string;

  protected readonly endpoint: CfnEndpoint;

  constructor(scope: Construct, id: string, props: EndpointProps, additionalProps: any) {
    super(scope, id);

    this.endpoint = new CfnEndpoint(this, 'Resource', {
      endpointType: props.endpointType,
      engineName: props.engineName,
      ...additionalProps,
    });

    this.endpointExternalId = this.endpoint.attrExternalId;
  }
}

/**
 * A DMS source endpoint
 *
 * @resource AWS::DMS::Endpoint
 */
export class SourceEndpoint extends Endpoint implements ISourceEndpoint {
  /**
   * Import an existing source endpoint
   */
  public static fromSourceEndpointArn(scope: Construct, id: string, sourceEndpointArn: string): ISourceEndpoint {
    class Import extends Resource implements ISourceEndpoint {
      public readonly sourceEndpointArn = sourceEndpointArn;
    }
    return new Import(scope, id);
  }

  /**
   * Database source endpoint
   */
  public static databaseSourceEndpoint(scope: Construct, id: string, props: DatabaseEndpointProps): SourceEndpoint {
    const additionalProps: AdditionalProps = {
      certificateArn: props.certificate?.certificateArn,
      kmsKeyId: props.encryptionKey?.keyId,
    };

    return new SourceEndpoint(scope, id, props, additionalProps);
  }

  /**
   * MySQL database source endpoint
   */
  public static mysqlDatabaseSourceEndpoint(scope: Construct, id: string, props: DatabaseEndpointOptions): SourceEndpoint {
    return SourceEndpoint.databaseSourceEndpoint(scope, id, {
      ...props,
      engineName: 'mysql',
    });
  }

  public readonly sourceEndpointArn: string;

  private constructor(scope: Construct, id: string, props: EndpointOptions, additionalProps: any) {
    super(scope, id, {
      ...props,
      endpointType: EndpointType.SOURCE,
    }, additionalProps);

    this.sourceEndpointArn = this.endpoint.ref;
  }
}

/**
 * A DMS target endpoint
 *
 * @resource AWS::DMS::Endpoint
 */
export class TargetEndpoint extends Endpoint implements ITargetEndpoint {
  /**
   * Import an existing source endpoint
   */
  public static fromTargetEndpointArn(scope: Construct, id: string, targetEndpointArn: string): ITargetEndpoint {
    class Import extends Resource implements ITargetEndpoint {
      public readonly targetEndpointArn = targetEndpointArn;
    }
    return new Import(scope, id);
  }

  public readonly targetEndpointArn: string;

  private constructor(scope: Construct, id: string, props: EndpointOptions, additionalProps: any) {
    super(scope, id, {
      ...props,
      endpointType: EndpointType.TARGET,
    }, additionalProps);

    this.targetEndpointArn = this.endpoint.ref;
  }
}

/**
 * Options for a database endpoint
 */
export interface DatabaseEndpointOptions extends EndpointBaseOptions {
  /**
   * The certificate to use for SSL encryption between the endpoint and the
   * replication instance.
   *
   * @default - do not use SSL encryption
   */
  readonly certificate?: ICertificate;

  /**
   * An AWS KMS key that is used to encrypt the connection parameters for the
   * endpoint.
   *
   * @default - default encryption key
   */
  readonly encryptionKey?: kms.IKey;
}

/**
 * Properties for a database endpoint
 */
export interface DatabaseEndpointProps extends DatabaseEndpointOptions {
  /**
   * The name of the engine
   */
  readonly engineName: string;
}
