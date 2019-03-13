import { expect, haveResource } from '@aws-cdk/assert';
import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/cdk');
import { Test } from 'nodeunit';
import { DatabaseInstance, DatabaseInstanceEngine, InstanceParameterGroup, OptionGroup } from '../lib';

export = {
  'create a database instance'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const vpc = new ec2.VpcNetwork(stack, 'VPC');

    // WHEN
    new DatabaseInstance(stack, 'Instance', {
      engine: DatabaseInstanceEngine.Mysql,
      instanceClass: new ec2.InstanceTypePair(ec2.InstanceClass.Burstable2, ec2.InstanceSize.Medium),
      vpc
    });

    // THEN
    expect(stack).to(haveResource('AWS::RDS::DBInstance', {
      Engine: 'mysql',
      DBInstanceClass: 'db.t2.medium',
      AllocatedStorage: '100',
      AutoMinorVersionUpgrade: false,
      BackupRetentionPeriod: '7',
      CopyTagsToSnapshot: true,
      DBSubnetGroupName: {
        Ref: 'InstanceSubnetGroupF2CBA54F'
      },
      DeleteAutomatedBackups: false,
      DeletionProtection: true,
      Iops: 1000,
      MasterUsername: {
        'Fn::Join': [
          '',
          [
            '{{resolve:secretsmanager:',
            {
              Ref: 'InstanceSecret4096DC51'
            },
            ':SecretString:username::}}'
          ]
        ]
      },
      MasterUserPassword: {
        'Fn::Join': [
          '',
          [
            '{{resolve:secretsmanager:',
            {
              Ref: 'InstanceSecret4096DC51'
            },
            ':SecretString:password::}}'
          ]
        ]
      },
      MultiAZ: true,
      StorageEncrypted: true,
      StorageType: 'io1',
      VPCSecurityGroups: [
        {
          'Fn::GetAtt': [
            'InstanceSecurityGroupB4E5FA83',
            'GroupId'
          ]
        }
      ]
    }));

    expect(stack).to(haveResource('AWS::RDS::DBSubnetGroup', {
      DBSubnetGroupDescription: `Subnet group for Instance database`,
      SubnetIds: [
        {
          Ref: 'VPCPrivateSubnet1Subnet8BCA10E0'
        },
        {
          Ref: 'VPCPrivateSubnet2SubnetCFCDAA7A'
        },
        {
          Ref: 'VPCPrivateSubnet3Subnet3EDCD457'
        }
      ]
    }));

    expect(stack).to(haveResource('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Instance database',
      VpcId: {
        Ref: 'VPCB9E5F0B4'
      }
    }));

    expect(stack).to(haveResource('AWS::SecretsManager::Secret'));

    expect(stack).to(haveResource('AWS::SecretsManager::SecretTargetAttachment'));

    test.done();
  },

  'with enhanced monitoring'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const vpc = new ec2.VpcNetwork(stack, 'VPC');

    // WHEN
    new DatabaseInstance(stack, 'Instance', {
      engine: DatabaseInstanceEngine.Mysql,
      instanceClass: new ec2.InstanceTypePair(ec2.InstanceClass.Burstable2, ec2.InstanceSize.Medium),
      vpc,
      monitoringInterval: 60
    });

    // THEN
    expect(stack).to(haveResource('AWS::RDS::DBInstance', {
      MonitoringInterval: 60,
      MonitoringRoleArn: {
        'Fn::GetAtt': [
          'InstanceMonitoringRole3E2B4286',
          'Arn'
        ]
      }
    }));

    expect(stack).to(haveResource('AWS::IAM::Role', {
      ManagedPolicyArns: [
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition'
              },
              ':iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole'
            ]
          ]
        }
      ]
    }));

    test.done();
  },

  'throws when mutli az is not possible'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();

    // WHEN
    const vpc = new ec2.VpcNetwork(stack, 'VPC', {
      maxAZs: 1
    });

    // THEN
    test.throws(() => new DatabaseInstance(stack, 'Instance', {
      engine: DatabaseInstanceEngine.Mysql,
      instanceClass: new ec2.InstanceTypePair(ec2.InstanceClass.Burstable2, ec2.InstanceSize.Medium),
      vpc
    }), /at least 2 subnets in 2 different availability zones/);

    test.done();
  },

  'export/import instance'(test: Test) {
    // GIVEN
    const stack1 = new cdk.Stack();
    const stack2 = new cdk.Stack();

    const instance = new DatabaseInstance(stack1, 'Database', {
      engine: DatabaseInstanceEngine.Mysql,
      instanceClass: new ec2.InstanceTypePair(ec2.InstanceClass.Burstable2, ec2.InstanceSize.Medium),
      vpc: new ec2.VpcNetwork(stack1, 'VPC')
    });

    // WHEN
    DatabaseInstance.import(stack2, 'Database', instance.export());

    // THEN: No error

    test.done();
  },

  'with parameter and option group'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const vpc = new ec2.VpcNetwork(stack, 'VPC');

    // WHEN
    const optionGroup = new OptionGroup(stack, 'OptionGroup', {
      engineName: DatabaseInstanceEngine.OracleSE1,
      majorEngineVersion: '11.2',
      configurations: [
        {
          name: 'XMLDB',
        }
      ]
    });

    const parameterGroup = new InstanceParameterGroup(stack, 'ParameterGroup', {
      family: 'oracle-se1-11.2',
      parameters: {
        open_cursors: '2500'
      }
    });

    new DatabaseInstance(stack, 'Database', {
      engine: DatabaseInstanceEngine.OracleSE1,
      instanceClass: new ec2.InstanceTypePair(ec2.InstanceClass.Burstable2, ec2.InstanceSize.Medium),
      vpc,
      optionGroup,
      parameterGroup
    });

    // THEN
    expect(stack).to(haveResource('AWS::RDS::OptionGroup', {
      EngineName: 'oracle-se1',
      MajorEngineVersion: '11.2',
      OptionConfigurations: [
        {
          OptionName: 'XMLDB'
        }
      ],
      OptionGroupDescription: 'Option group for oracle-se1 11.2'
    }));

    expect(stack).to(haveResource('AWS::RDS::DBParameterGroup', {
      Description: 'Parameter group for oracle-se1-11.2',
      Family: 'oracle-se1-11.2',
      Parameters: {
        open_cursors: '2500'
      }
    }));

    expect(stack).to(haveResource('AWS::RDS::DBInstance', {
      OptionGroupName: {
        Ref: 'OptionGroupACA43DC1'
      },
      DBParameterGroupName: {
        Ref: 'ParameterGroup5E32DECB'
      }
    }));

    test.done();
  },

  'export/import option group'(test: Test) {
    // GIVEN
    const stack1 = new cdk.Stack();
    const stack2 = new cdk.Stack();

    const optionGroup = new OptionGroup(stack1, 'OptionGroup', {
      engineName: DatabaseInstanceEngine.OracleSE1,
      majorEngineVersion: '11.2',
      configurations: [
        {
          name: 'XMLDB',
        }
      ]
    });

    // WHEN
    OptionGroup.import(stack2, 'Database', optionGroup.export());

    // THEN: No error

    test.done();
  },

  'export/import parameter group'(test: Test) {
    // GIVEN
    const stack1 = new cdk.Stack();
    const stack2 = new cdk.Stack();

    const parameterGroup = new InstanceParameterGroup(stack1, 'ParameterGroup', {
      family: 'oracle-se1-11.2',
      parameters: {
        open_cursors: '2500'
      }
    });

    // WHEN
    InstanceParameterGroup.import(stack2, 'Database', parameterGroup.export());

    // THEN: No error

    test.done();
  },

  'with rotation'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const vpc = new ec2.VpcNetwork(stack, 'VPC');

    const instance = new DatabaseInstance(stack, 'MySQL', {
      engine: DatabaseInstanceEngine.Mysql,
      instanceClass: new ec2.InstanceTypePair(ec2.InstanceClass.Burstable2, ec2.InstanceSize.Small),
      vpc
    });

    // WHEN
    instance.addMasterPasswordRotation('Rotation', {
      automaticallyAfterDays: 5
    });

    // THEN

    expect(stack).to(haveResource('AWS::Serverless::Application', {
      Location: {
        ApplicationId: 'arn:aws:serverlessrepo:us-east-1:297356227824:applications/SecretsManagerRDSMySQLRotationSingleUser',
        SemanticVersion: '1.0.74'
      }
    }));

    expect(stack).to(haveResource('AWS::Lambda::Permission'));

    expect(stack).to(haveResource('AWS::SecretsManager::RotationSchedule', {
      RotationRules: {
        AutomaticallyAfterDays: 5
      }
    }));

    test.done();
  }
};
