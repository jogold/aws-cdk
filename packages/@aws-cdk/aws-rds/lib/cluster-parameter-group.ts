import cdk = require('@aws-cdk/cdk');
import { IParameterGroup, ParameterGroup, ParameterGroupProps } from './parameter-group';
import { CfnDBClusterParameterGroup } from './rds.generated';

/**
 * A cluster parameter group.
 */
export class ClusterParameterGroup extends ParameterGroup implements IParameterGroup {
  /**
   * The parameter group name.
   */
  public readonly parameterGroupName: string;

  constructor(scope: cdk.Construct, id: string, props: ParameterGroupProps) {
    super(scope, id, props);

    const parameterGroup = new CfnDBClusterParameterGroup(this, 'Resource', {
      description: this.description,
      family: props.family,
      parameters: new cdk.Token(() => this.parameters)
    });

    this.parameterGroupName = parameterGroup.dbClusterParameterGroupName;
  }
}
