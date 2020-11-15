import * as fs from 'fs';
import { IResource, Resource } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { CfnCertificate } from './dms.generated';

const IDENTIFIER_REGEX = /^(?!-)(?!.*--)[A-Za-z0-9-]+(?<!-)$/;

/**
 * A DMS SSL Certificate
 */
export interface ICertificate extends IResource {
  /**
   * The Amazon Resource Name (ARN) of the certificate
   *
   * @attribute
   */
  readonly certificateArn: string;
}

/**
 * Properties for a DMS SSL Certificate
 */
export interface CertificateProps {
  /**
   * A customer-assigned name for the certificate.
   *
   * Name must begin with a letter and must contain only ASCII letters,
   * digits, and hyphens. They can't end with a hyphen or contain two consecutive
   * hyphens.
   *
   * @default - an AWS DMS generated name
   */
  readonly certificateIdentifier?: string;

  /**
   * The file to use for the certificate.
   */
  readonly certificateFile: CertificateFile;
}

/**
 * The type of certificate
 */
export abstract class CertificateFile {
  /** From a string representing a PEM certificate */
  public static fromPem(pem: string): CertificateFile {
    return {
      certificatePem: pem,
    };
  }

  /** From a .pem file */
  public static fromPemFile(path: string): CertificateFile {
    return CertificateFile.fromPem(fs.readFileSync(path, 'utf-8'));
  }

  /** From a string representing an Oracle wallet (SSO) */
  public static fromSso(sso: string): CertificateFile {
    return {
      certificateWallet: sso,
    };
  }

  /** From a .sso file */
  public static fromSsoFile(path: string): CertificateFile {
    return CertificateFile.fromSso(fs.readFileSync(path, 'utf-8'));
  }

  /**
   * The contents of a .pem file, which contains an X.509 certificate.
   */
  public abstract readonly certificatePem?: string;

  /**
   * The location of an imported Oracle Wallet certificate for use with SSL.
   */
  public abstract readonly certificateWallet?: string;
}

/**
 * A DMS SSL Certificate
 */
export class Certificate extends Resource implements ICertificate {
  /**
   * Import an existing certificate
   */
  public static fromCertificateArn(scope: Construct, id: string, certificateArn: string): ICertificate {
    class Import extends Resource implements ICertificate {
      public readonly certificateArn = certificateArn;
    }
    return new Import(scope, id);
  }

  public readonly certificateArn: string;

  constructor(scope: Construct, id: string, props: CertificateProps) {
    super(scope, id);

    if (props.certificateIdentifier && !IDENTIFIER_REGEX.test(props.certificateIdentifier)) {
      throw new Error('Identifier must begin with a letter and must contain only ASCII letters, digits, and hyphens. They can\'t end with a hyphen or contain two consecutive hyphens.');
    }

    const certificate = new CfnCertificate(this, 'Resource', {
      certificateIdentifier: props.certificateIdentifier,
      certificatePem: props.certificateFile.certificatePem,
      certificateWallet: props.certificateFile.certificateWallet,
    });

    this.certificateArn = certificate.ref;
  }
}
