import { IResource, Resource } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { CfnReplicationTask } from './dms.generated';
import { ISourceEndpoint, ITargetEndpoint } from './endpoint';
import { IReplicationInstance } from './replication-instance';

const IDENTIFIER_REGEX = /^(?![\-0-9])(?!.*--)[A-Za-z0-9-]{1,255}(?<!-)$/;

/**
 * A DMS replication task
 */
export interface IReplicationTask extends IResource {
  /**
   * The Amazon Resource Name (ARN) of the certificate
   *
   * @attribute
   */
  readonly replicationTaskArn: string;
}

/**
 * Properties for a DMS replication task
 */
export interface ReplicationTaskProps {
  /**
   * Indicates when you want a change data capture (CDC) operation to start.
   *
   * @default - do not start after a position of time
   */
  readonly cdcStart?: CdcStart;

  /**
   * Indicates when you want a change data capture (CDC) operation to stop.
   *
   * The value can be either server time or commit time.
   */
  readonly cdcStop?: string;

  /**
   * The migration type
   */
  readonly migrationType: MigrationType;

  /**
   * The replication instance to use
   */
  readonly replicationInstance: IReplicationInstance;

  /**
   * An identifier for the replication task.
   *
   * Constraints:
   *   - Must contain 1-255 alphanumeric characters or hyphens.
   *   - First character must be a letter.
   *   - Cannot end with a hyphen or contain two consecutive hyphens.
   *
   * @default - an AWS DMS generated identifier
   */
  readonly replicationTaskIdentifier?: string;

  /**
   * Overall settings for the task
   *
   * @see https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.html
   */
  readonly replicationTaskSettings?: any

  /**
   * Source endpoint
   */
  readonly sourceEndpoint: ISourceEndpoint;

  /**
   * The table mappings for the task
   *
   * @see https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.html
   */
  readonly tableMappings: string

  /**
   * Target endpoint
   */
  readonly targetEndpoint: ITargetEndpoint;
}

/**
 * A change data capture (CDC) start
 */
export abstract class CdcStart {
  /**
   * Start at a position.
   *
   * The value can be in date, checkpoint, or LSN/SCN format.
   *
   * @example 2018-03-08T12:12:12
   * @example checkpoint:V1#27#mysql-bin-changelog.157832:1975:-1:2002:677883278264080:mysql-bin-changelog.157832:1876#0#0#*#0#93
   * @example mysql-bin-changelog.000024:373
   */
  public static position(position: string): CdcStart {
    return { cdcStartPosition: position };
  }

  /**
   * Start at a time
   */
  public static time(time: number): CdcStart {
    return { cdcStartTime: time };
  }

  /**
   * Start position
   *
   * @default - use start time
   */
  public abstract readonly cdcStartPosition?: string;

  /**
   * Start time
   *
   * @default - use start position
   */
  public abstract readonly cdcStartTime?: number;
}

/**
 * A change data capture (CDC) stop
 */
export abstract class CdcStop {
  /**
   * Server time
   */
  public static serverTime(time: string): CdcStop {
    return { cdcStopPosition: `server_time:${time}` };
  }

  /**
   * Commit time
   */
  public static commitTime(time: string): CdcStop {
    return { cdcStopPosition: `commit_time:${time}` };
  }

  /**
   * Stop position
   *
   * @example server_time:2018-02-09T12:12:12
   * @example commit_time:2018-02-09T12:12:12
   */
  public abstract readonly cdcStopPosition?: string;
}

/**
 * Migration type
 */
export enum MigrationType {
  /**
   * Migrate existing data.
   *
   * Perform a one-time migration from the source endpoint to the target endpoint.
   */
  FULL_LOAD = 'full-load',

  /**
   * Migrate existing data and replicate ongoing changes.
   *
   * Perform a one-time migration from the source to the target, and then continue
   * replicating data changes from the source to the target.
   */
  FULL_LOAD_AND_CDC = 'full-load-and-cdc',

  /**
   * Replicate data changes only.
   *
   * Don't perform a one-time migration, but continue to replicate data changes
   * from the source to the target.
   */
  CDC = 'cdc'
}

/**
 * A DMS replication task
 */
export class ReplicationTask extends Resource implements IReplicationTask {
  /**
   * Import an existing replication task
   */
  public static fromReplicationTaskArn(scope: Construct, id: string, replicationTaskArn: string): IReplicationTask {
    class Import extends Resource implements IReplicationTask {
      public readonly replicationTaskArn = replicationTaskArn;
    }
    return new Import(scope, id);
  }

  public readonly replicationTaskArn: string;

  constructor(scope: Construct, id: string, props: ReplicationTaskProps) {
    super(scope, id);

    if (props.replicationTaskIdentifier && !IDENTIFIER_REGEX.test(props.replicationTaskIdentifier)) {
      throw new Error('Identifier must begin with a letter and must contain only ASCII letters, digits, and hyphens. They can\'t end with a hyphen or contain two consecutive hyphens. Maximum length is 255.');
    }

    const task = new CfnReplicationTask(this, 'Resource', {
      cdcStartPosition: props.cdcStart?.cdcStartPosition,
      cdcStartTime: props.cdcStart?.cdcStartTime,
      cdcStopPosition: props.cdcStop,
      migrationType: props.migrationType,
      replicationInstanceArn: props.replicationInstance.replicationInstanceArn,
      replicationTaskIdentifier: props.replicationTaskIdentifier,
      replicationTaskSettings: props.replicationTaskSettings,
      sourceEndpointArn: props.sourceEndpoint.sourceEndpointArn,
      tableMappings: props.tableMappings,
      targetEndpointArn: props.targetEndpoint.targetEndpointArn,
    });

    this.replicationTaskArn = task.ref;
  }
}
