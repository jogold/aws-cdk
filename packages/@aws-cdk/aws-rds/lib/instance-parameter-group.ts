import cdk = require('@aws-cdk/cdk');
import { IParameterGroup, ParameterGroup, ParameterGroupProps } from './parameter-group';
import { CfnDBParameterGroup } from './rds.generated';

/**
 * An instance parameter group.
 */
export class InstanceParameterGroup extends ParameterGroup implements IParameterGroup {
  /**
   * The parameter group name.
   */
  public readonly parameterGroupName: string;

  constructor(scope: cdk.Construct, id: string, props: ParameterGroupProps) {
    super(scope, id, props);

    const parameterGroup = new CfnDBParameterGroup(this, 'Resource', {
      description: this.description,
      family: props.family,
      parameters: new cdk.Token(() => this.parameters)
    });

    this.parameterGroupName = parameterGroup.dbParameterGroupName;
  }
}
