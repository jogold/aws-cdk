import cdk = require('@aws-cdk/cdk');

/**
 * A cluster or instance parameter group.
 */
export interface IParameterGroup extends cdk.IConstruct {
  /**
   * The name of this parameter group.
   */
  readonly parameterGroupName: string;

  /**
   * Exports this parameter group from the stack.
   */
  export(): ParameterGroupImportProps;
}

/**
 * Type for database parameters
 */
export type Parameters = {[key: string]: any};

/**
 * Construction properties for a ParameterGroup.
 */
export interface ParameterGroupProps {
  /**
   * The database family of this DB cluster parameter group.
   */
  family: string;

  /**
   * A friendly description of the RDS parameter group.
   *
   * @default a CDK generated description
   */
  description?: string;

  /**
   * The parameters to set for this parameter group.
   */
  parameters?: Parameters;
}

/**
 * A new cluster or instance parameter group.
 */
export abstract class ParameterGroup extends cdk.Construct implements IParameterGroup {
  /**
   * Imports an existing parameter group.
   */
  public static import(scope: cdk.Construct, id: string, props: ParameterGroupImportProps) {
    return new ImportedParameterGroup(scope, id, props);
  }

  /**
   * The name of the parameter group.
   */
  public abstract readonly parameterGroupName: string;

  protected readonly description: string;
  protected readonly parameters: Parameters = {};

  constructor(scope: cdk.Construct, id: string, props: ParameterGroupProps) {
    super(scope, id);

    this.description = props.description || `Parameter group for ${props.family}`;

    for (const [key, value] of Object.entries(props.parameters || {})) {
      this.setParameter(key, value);
    }
  }

  /**
   * Exports this parameter group
   */
  public export(): ParameterGroupImportProps {
    return {
      parameterGroupName: new cdk.CfnOutput(this, 'ParameterGroupName', { value: this.parameterGroupName }).makeImportValue().toString()
    };
  }

  /**
   * Sets a single parameter in this parameter group
   */
  public setParameter(key: string, value: string | undefined) {
    if (value === undefined && key in this.parameters) {
      delete this.parameters[key];
    }
    if (value !== undefined) {
      this.parameters[key] = value;
    }
  }

  /**
   * Removes a previously-set parameter from this parameter group
   */
  public removeParameter(key: string) {
    this.setParameter(key, undefined);
  }

  /**
   * Validates this construct
   */
  protected validate(): string[] {
    if (Object.keys(this.parameters).length === 0) {
      return ['At least one parameter required, call setParameter().'];
    }
    return [];
  }
}

/**
 * Construction properties for an ImportedParameterGroup.
 */
export interface ParameterGroupImportProps {
  /**
   * The parameter group name.
   */
  parameterGroupName: string;
}

/**
 * An imported parameter group
 */
class ImportedParameterGroup extends cdk.Construct implements IParameterGroup {
  public readonly parameterGroupName: string;

  constructor(scope: cdk.Construct, id: string, private readonly props: ParameterGroupImportProps) {
    super(scope, id);
    this.parameterGroupName = props.parameterGroupName;
  }

  /**
   * Exports this parameter group from the stack.
   */
  public export() {
    return this.props;
  }
}
