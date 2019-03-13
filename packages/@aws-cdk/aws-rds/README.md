## AWS RDS Construct Library

The `aws-cdk-rds` package contains Constructs for setting up RDS instances.

### Starting a Clustered Database

To set up a clustered database (like Aurora), create an instance of `DatabaseCluster`. You must
always launch a database in a VPC. Use the `vpcPlacement` attribute to control whether
your instances will be launched privately or publicly:

```ts
const cluster = new DatabaseCluster(this, 'Database', {
    engine: DatabaseClusterEngine.Aurora,
    masterUser: {
        username: 'admin',
        password: '7959866cacc02c2d243ecfe177464fe6',
    },
    instanceProps: {
        instanceType: new InstanceTypePair(InstanceClass.Burstable2, InstanceSize.Small),
        vpcPlacement: {
            subnetsToUse: ec2.SubnetType.Public,
        },
        vpc
    }
});
```

Your cluster will be empty by default. To add a default database upon construction, specify the
`defaultDatabaseName` attribute.

### Starting an instance database

To set up an instance database, create an instance of `DatabaseInstance`. You must
always launch a database in a VPC. Use the `vpcPlacement` attribute to control whether
your instances will be launched privately or publicly. If no `masterUserPassword` is specified the default for a new instance (no snapshot or source instance) is to generate and store the master password in AWS Secrets Manager. This behavior can be forced by setting `generateMasterUserPassword` to `true`.

```ts
const instance = new DatabaseInstance(this, 'MySQL', {
  engine: DatabaseInstanceEngine.Mysql,
  instanceClass: new ec2.InstanceTypePair(ec2.InstanceClass.Burstable2, ec2.InstanceSize.Small),
  vpc,
  masterUsername: 'admin'
});

// Add master password rotation every 30 days
instance.addMasterPasswordRotation('Rotation');

// Export secret
const secretRef = instance.secret.export();
```

### Connecting to cluster or instance

To control who can access the cluster or instance, use the `.connections` attribute. RDS database have
a default port, so you don't need to specify the port:

```ts
cluster.connections.allowFromAnyIpv4('Open to the world');
```

The endpoints to access your database will be available as the `.clusterEndpoint` and `.readerEndpoint`
attributes:

```ts
const writeAddress = cluster.clusterEndpoint.socketAddress;   // "HOSTNAME:PORT"
```
