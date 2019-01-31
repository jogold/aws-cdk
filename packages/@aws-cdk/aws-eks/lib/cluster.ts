import asg = require('@aws-cdk/aws-autoscaling');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');
import { ClusterBase } from './cluster-base';
import { CfnCluster } from './eks.generated';
import { EKS_AMI, MAX_PODS, NodeType } from './instance-data';

/**
 * Properties to instantiate the Cluster
 */
export interface ClusterProps {
  /**
   * The VPC in which to create the Cluster
   */
  vpc: ec2.IVpcNetwork;

  /**
   * Where to place the cluster within the VPC
   * Which SubnetType this placement falls in
   * @default If not supplied, defaults to public
   * subnets if available otherwise private subnets
   */
  vpcPlacement: ec2.VpcPlacementStrategy;

  /**
   * Role that provides permissions for the Kubernetes control plane to make calls to AWS API operations on your behalf.
   *
   * @default A role is automatically created for you
   */
  role?: iam.IRole;

  /**
   * Name for the cluster.
   *
   * @default Automatically generated name
   */
  clusterName?: string;

  /**
   * The Kubernetes version to run in the cluster
   *
   * @default If not supplied, will use Amazon default version
   */
  version?: string;
}

/**
 * A Cluster represents a managed Kubernetes Service (EKS)
 *
 * This is a fully managed cluster of API Servers (control-plane)
 * The user is still required to create the worker nodes.
 */
export class Cluster extends ClusterBase {
  /**
   * Import an existing cluster
   *
   * @param parent the construct parent, in most cases 'this'
   * @param id the id or name to import as
   * @param props the cluster properties to use for importing information
   */
  public static import(parent: cdk.Construct, id: string, props: ClusterImportProps): ICluster {
    return new ImportedCluster(parent, id, props);
  }

  public readonly vpc: ec2.IVpcNetwork;

  /**
   * The Name of the created EKS Cluster
   */
  public readonly clusterName: string;

  /**
   * The AWS generated ARN for the Cluster resource
   *
   * @example arn:aws:eks:us-west-2:666666666666:cluster/prod
   */
  public readonly clusterArn: string;

  /**
   * The endpoint URL for the Cluster
   *
   * This is the URL inside the kubeconfig file to use with kubectl
   *
   * @example https://5E1D0CEXAMPLEA591B746AFC5AB30262.yl4.us-west-2.eks.amazonaws.com
   */
  public readonly clusterEndpoint: string;

  /**
   * The certificate-authority-data for your cluster.
   */
  public readonly clusterCertificateAuthorityData: string;

  /**
   * Manages connection rules (Security Group Rules) for the cluster
   *
   * @type {ec2.Connections}
   * @memberof Cluster
   */
  public readonly connections: ec2.Connections;

  /**
   * IAM role assumed by the EKS Control Plane
   */
  public readonly role: iam.IRole;

  /**
   * Initiates an EKS Cluster with the supplied arguments
   *
   * @param parent a Construct, most likely a cdk.Stack created
   * @param name the name of the Construct to create
   * @param props properties in the IClusterProps interface
   */
  constructor(parent: cdk.Construct, name: string, props: ClusterProps) {
    super(parent, name);

    this.vpc = props.vpc;

    const subnetIds: string[] = this.vpc.subnets(props.vpcPlacement).map(s => s.subnetId);

    this.role = props.role || new iam.Role(this, 'ClusterRole', {
      assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
      managedPolicyArns: [
        new iam.AwsManagedPolicy('policy/AmazonEKSClusterPolicy', this).policyArn,
        new iam.AwsManagedPolicy('policy/AmazonEKSServicePolicy', this).policyArn,
      ],
    });

    this.securityGroup = this.addSecurityGroup();
    this.securityGroupId = this.securityGroup.securityGroupId;
    this.connections = new ec2.Connections({
      securityGroups: [this.securityGroup],
    });

    const resource = new CfnCluster(this, 'Resource', {
      name: props.clusterName,
      roleArn: this.role.roleArn,
      version: props.version,
      resourcesVpcConfig: {

      }
    });

    this.clusterName = resource.clusterName;
    this.clusterArn = resource.clusterArn;
    this.clusterEndpoint = resource.clusterEndpoint;
    this.clusterCertificateAuthorityData = resource.clusterCertificateAuthorityData;
  }
}

/**
 * Properties for instantiating an Autoscaling Group of worker nodes
 * The options are limited on purpose, though moe can be added.
 * The requirements for Kubernetes scaling and updated configurations
 * are a bit different.
 *
 * More properties will be added to match those in the future.
 */
export interface INodeProps {
  vpc: ec2.VpcNetworkRef;
  cluster: ClusterRef;
  /**
   * The ec2 InstanceClass to use on the worker nodes
   * Note, not all instance classes are supported
   * ref: https://amazon-eks.s3-us-west-2.amazonaws.com/cloudformation/2018-08-30/amazon-eks-nodegroup.yaml
   *
   * example: ec2.InstanceClass.M5
   *
   * @default M5
   */
  nodeClass?: ec2.InstanceClass;
  /**
   * The size of the chosen instance class.
   * Note, not all instancer sizes are supported per class.
   * ref: https://amazon-eks.s3-us-west-2.amazonaws.com/cloudformation/2018-08-30/amazon-eks-nodegroup.yaml
   *
   * example: ec2.InstanceSize.Large
   *
   * @default Large
   */
  nodeSize?: ec2.InstanceSize;
  /**
   * The instance type for EKS to support
   * Whether to support GPU optimized EKS or Normal instances
   *
   * @default Normal
   */
  nodeType?: NodeType;
  /**
   * Minimum number of instances in the worker group
   *
   * @default 1
   */
  minNodes?: number;
  /**
   * Maximum number of instances in the worker group
   *
   * @default 1
   */
  maxNodes?: number;
  /**
   * The name of the SSH keypair to grant access to the worker nodes
   * This must be created in the AWS Console first
   *
   * @default No SSH access granted
   */
  sshKeyName?: string;
  /**
   * Additional tags to associate with the worker group
   */
  tags?: cdk.Tags;
}
export class Nodes extends cdk.Construct {
  /**
   * A VPC reference to place the autoscaling group of nodes inside
   *
   * @type {ec2.VpcNetworkRef}
   * @memberof Nodes
   */
  public readonly vpc: ec2.VpcNetworkRef;
  /**
   * The autoscaling group used to setup the worker nodes
   *
   * @type {asg.AutoScalingGroup}
   * @memberof Nodes
   */
  public readonly nodeGroup: asg.AutoScalingGroup;
  /**
   * An array of worker nodes as multiple groups can be deployed
   * within a Stack. This is mainly to track and can be read from
   *
   * @type {asg.AutoScalingGroup[]}
   * @memberof Nodes
   */
  public readonly nodeGroups: asg.AutoScalingGroup[] = [];

  private readonly vpcPlacement: ec2.VpcPlacementStrategy;
  private readonly clusterName: string;
  private readonly cluster: ClusterRef;

  /**
   * Creates an instance of Nodes.
   *
   * @param {cdk.Construct} parent
   * @param {string} name
   * @param {INodeProps} props
   * @memberof Nodes
   */
  constructor(parent: cdk.Construct, name: string, props: INodeProps) {
    super(parent, name);

    this.cluster = props.cluster;
    this.clusterName = props.cluster.clusterName;
    this.vpc = props.vpc;
    this.vpcPlacement = props.cluster.vpcPlacement;

    const nodeClass = props.nodeClass || ec2.InstanceClass.M5;
    const nodeSize = props.nodeSize || ec2.InstanceSize.Large;
    const nodeType = props.nodeType || NodeType.Normal;

    const type = new ec2.InstanceTypePair(nodeClass, nodeSize);
    const nodeProps: asg.AutoScalingGroupProps = {
      vpc: this.vpc,
      instanceType: type,
      machineImage: new ec2.GenericLinuxImage(EKS_AMI[nodeType]),
      minSize: props.minNodes || 1,
      maxSize: props.maxNodes || 1,
      desiredCapacity: props.minNodes || 1,
      keyName: props.sshKeyName,
      vpcPlacement: this.vpcPlacement,
      tags: props.tags,
    };
    this.nodeGroup = this.addNodes(nodeProps, type);
  }

  private addNodes(props: asg.AutoScalingGroupProps, type: ec2.InstanceTypePair) {
    const nodes = new asg.AutoScalingGroup(this, `NodeGroup-${type.toString()}`, props);
    // EKS Required Tags
    nodes.tags.setTag(`kubernetes.io/cluster/${this.clusterName}`, 'owned', {
      overwrite: false,
    });

    this.addRole(nodes.role);

    // bootstrap nodes
    this.addUserData({ nodes, type: type.toString() });
    this.addDefaultRules({ nodes });

    this.nodeGroups.push(nodes);

    return nodes;
  }

  private addDefaultRules(props: { nodes: asg.AutoScalingGroup }) {
    // self rules
    props.nodes.connections.allowInternally(new ec2.AllTraffic());

    // Cluster to:nodes rules
    props.nodes.connections.allowFrom(this.cluster, new ec2.TcpPort(443));
    props.nodes.connections.allowFrom(this.cluster, new ec2.TcpPortRange(1025, 65535));

    // Allow HTTPS from Nodes to Cluster
    props.nodes.connections.allowTo(this.cluster, new ec2.TcpPort(443));

    // Allow all node outbound traffic
    props.nodes.connections.allowToAnyIPv4(new ec2.TcpAllPorts());
    props.nodes.connections.allowToAnyIPv4(new ec2.UdpAllPorts());
    props.nodes.connections.allowToAnyIPv4(new ec2.IcmpAllTypesAndCodes());
  }

  private addUserData(props: { nodes: asg.AutoScalingGroup; type: string }) {
    const max = MAX_PODS.get(props.type);
    props.nodes.addUserData(
      'set -o xtrace',
      `/etc/eks/bootstrap.sh ${this.clusterName} --use-max-pods ${max}`,
    );
  }

  private addRole(role: iam.Role) {
    role.attachManagedPolicy('arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy');
    role.attachManagedPolicy('arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy');
    role.attachManagedPolicy('arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly');

    return role;
  }
}

/**
 * Import a cluster to use in another stack
 * This cluster was not created here
 *
 * @default NO
 *
 * Cross stack currently runs into an issue with references
 * to security groups that are in stacks not yet deployed
 */
class ImportedCluster extends ClusterBase {
  public readonly clusterName: string;
  public readonly clusterArn: string;
  public readonly clusterEndpoint: string;
  public readonly vpcPlacement: ec2.VpcPlacementStrategy;
  public readonly securityGroupId: string;
  public readonly connections: ec2.Connections;

  constructor(parent: cdk.Construct, name: string, props: IClusterRefProps) {
    super(parent, name);

    this.clusterName = props.clusterName;
    this.clusterEndpoint = props.clusterEndpoint;
    this.clusterArn = props.clusterArn;
    this.vpcPlacement = props.vpcPlacement;
    this.securityGroupId = props.securityGroupId;
    this.connections = props.connections;
  }
}
