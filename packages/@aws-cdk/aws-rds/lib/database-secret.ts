import kms = require('@aws-cdk/aws-kms');
import secretsmanager = require('@aws-cdk/aws-secretsmanager');
import cdk = require('@aws-cdk/cdk');
import { ISecret } from '@aws-cdk/aws-secretsmanager';

/**
 * Construction properties for a DatabaseSecret.
 */
export interface DatabaseSecretProps {
  /**
   * The username.
   *
   * @default admin
   */
  username?: string;

  /**
   * The KMS key to use to encrypt the secret.
   *
   * @default default master key
   */
  secretKmsKey?: kms.IEncryptionKey;
}

/**
 * A database secret.
 */
export class DatabaseSecret extends cdk.Construct {
  /**
   * The secret.
   */
  public readonly secret: ISecret;

  constructor(scope: cdk.Construct, id: string, props: DatabaseSecretProps) {
    super(scope, id);

    this.secret = new secretsmanager.Secret(this, 'Resource', {
      encryptionKey: props.secretKmsKey,
      generateSecretString: {
        passwordLength: 30, // Oracle password cannot have more than 30 characters
        secretStringTemplate: JSON.stringify({ username: props.username || 'admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\'
      }
    });
  }
}
