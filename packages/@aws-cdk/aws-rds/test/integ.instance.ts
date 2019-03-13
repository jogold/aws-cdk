import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/cdk');
import { DatabaseInstance, DatabaseInstanceEngine } from '../lib';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-cdk-rds-instance');

const vpc = new ec2.VpcNetwork(stack, 'VPC', { maxAZs: 2 });

const instance = new DatabaseInstance(stack, 'MySQL', {
  engine: DatabaseInstanceEngine.Mysql,
  instanceClass: new ec2.InstanceTypePair(ec2.InstanceClass.Burstable2, ec2.InstanceSize.Small),
  vpc
});

instance.addMasterPasswordRotation('Rotation');

app.run();
