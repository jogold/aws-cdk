import * as ec2 from '@aws-cdk/aws-ec2';
import { App, Stack, StackProps } from '@aws-cdk/core';
import { Construct } from 'constructs';
import * as dms from '../lib';

class TestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc');

    const instance = new dms.ReplicationInstance(this, 'Instance', { vpc });

    new dms.ReplicationTask(this, 'Task', {
      migrationType: dms.MigrationType.FULL_LOAD_AND_CDC,
      replicationInstance: instance,
      sourceEndpoint: dms.SourceEndpoint.mysqlDatabaseSourceEndpoint(this, 'Source', {}),
      tableMappings: JSON.stringify({}),
      targetEndpoint: dms.TargetEndpoint.fromTargetEndpointArn(this, 'Target', 'blabl'),
    });
  }
}

const app = new App();
new TestStack(app, 'cdk-dms-replication');
app.synth();
