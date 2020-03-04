import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { findPkgPath } from './util';

/**
 * Builder options
 */
export interface BuilderOptions {
  /**
   * Entry file
   */
  readonly entry: string;

  /**
   * The output directory
   */
  readonly outDir: string;

  /**
   * Expose modules as UMD under this name
   */
  readonly global: string;

  /**
   * Minify
   */
  readonly minify?: boolean;

  /**
   * Include source maps
   */
  readonly sourceMaps?: boolean;

  /**
   * The cache directory
   */
  readonly cacheDir?: string;

  /**
   * The node version to use as target for Babel
   */
  readonly nodeVersion?: string;

  /**
   * External modules
   */
  readonly externals?: string[];

  /**
   * Modules that should be included in the `node_modules` directory
   */
  readonly includes?: string[];

  /**
   * Whether to install modules in Docker
   */
  readonly installInDocker?: boolean;
}

/**
 * Builder
 */
export class Builder {
  private readonly pkgPath: string;

  private readonly originalPkg: Buffer;

  private readonly originalPkgJson: { [key: string]: any };

  private readonly parcelBinPath: string;

  constructor(private readonly options: BuilderOptions) {
    // Original package.json
    this.pkgPath = findPkgPath();
    this.originalPkg = fs.readFileSync(this.pkgPath);
    this.originalPkgJson = JSON.parse(this.originalPkg.toString());

    // Find parcel
    let parcelPkgPath: string;
    try {
      parcelPkgPath = require.resolve('parcel-bundler/package.json'); // This will throw if `parcel-bundler` cannot be found
    } catch (err) {
      throw new Error('It looks like parcel-bundler is not installed. Please install v1.x of parcel-bundler with yarn or npm.');
    }
    const parcelDir = path.dirname(parcelPkgPath);
    const parcelPkg = JSON.parse(fs.readFileSync(parcelPkgPath, 'utf8'));

    if (!parcelPkg.version || !/^1\./.test(parcelPkg.version)) { // Peer dependency on parcel v1.x
      throw new Error(`This module has a peer dependency on parcel-bundler v1.x. Got v${parcelPkg.version}.`);
    }

    this.parcelBinPath = path.join(parcelDir, parcelPkg.bin.parcel);

    // Clean out dir
    if (fs.existsSync(this.options.outDir)) {
      fs.rmdirSync(this.options.outDir, { recursive: true });
    }
  }

  public build(): void {
    try {
      this.updatePkg();

      const args = [
        'build', this.options.entry,
        '--out-dir', this.options.outDir,
        '--out-file', 'index.js',
        '--global', this.options.global,
        '--target', 'node',
        '--bundle-node-modules',
        '--log-level', '2',
        !this.options.minify && '--no-minify',
        !this.options.sourceMaps && '--no-source-maps',
        ...this.options.cacheDir
          ? ['--cache-dir', this.options.cacheDir]
          : [],
      ].filter(Boolean) as string[];

      const parcel = spawnSync(this.parcelBinPath, args);

      if (parcel.error) {
        throw parcel.error;
      }

      if (parcel.status !== 0) {
        throw new Error(parcel.stdout.toString().trim());
      }

      if (this.options.includes) {
        this.installIncludes(this.options.includes);
      }
    } catch (err) {
      throw new Error(`Failed to build file at ${this.options.entry}: ${err}`);
    } finally { // Always restore package.json to original
      this.restorePkg();
    }
  }

  /**
   * Updates the package.json to configure Parcel
   */
  private updatePkg() {
    const updateData: { [key: string]: any } = {};
    if (this.options.nodeVersion) { // Update engines.node (Babel target)
      updateData.engines = { node: `>= ${this.options.nodeVersion}` };
    }

    if (this.options.externals) { // Add externals for parcel-plugin-externals
      updateData.externals = [...this.options.externals, ...this.options.includes || []];
    }

    if (Object.keys(updateData).length !== 0) {
      fs.writeFileSync(this.pkgPath, JSON.stringify({
        ...this.originalPkgJson,
        ...updateData,
      }, null, 2));
    }
  }

  /**
   * Install modules that should be included in the node_modules directory
   */
  private installIncludes(includes: string[]) {
    // Use original dependencies for versions
    const dependencies: { [dependency: string]: string } = {
      ...this.originalPkgJson.dependencies ?? {},
      ...this.originalPkgJson.devDependencies ?? {},
      ...this.originalPkgJson.peerDependencies ?? {},
    };

    // Retain only includes
    const filteredDependencies: { [dependency: string]: string } = {};
    for (const [d, v] of Object.entries(dependencies)) {
      if (includes.includes(d)) {
        filteredDependencies[d] = v;
      }
    }

    // Write dummy package.json
    fs.writeFileSync(path.join(this.options.outDir, 'package.json'), JSON.stringify({
      dependencies: filteredDependencies
    }, null, 2));

    let installer = Installer.NPM;

    // Check if we have lock files
    let lockFile: string | undefined;
    const yarnLock = path.join(path.dirname(this.pkgPath), LockFile.YARN);
    const pkgLock = path.join(path.dirname(this.pkgPath), LockFile.NPM);

    // If we have a `yarn.lock` file copy it and use `yarn` as installer
    // otherwise use `package-lock.json` and `npm`.
    if (fs.existsSync(yarnLock)) {
      installer = Installer.YARN;
      lockFile = yarnLock;
    } else if (fs.existsSync(pkgLock)) {
      lockFile = pkgLock;
    }

    if (lockFile) {
      fs.copyFileSync(lockFile, path.join(this.options.outDir, path.basename(lockFile)));
    }

    const command = this.options.installInDocker ? 'docker' : installer;
    const args = this.options.installInDocker
      ? ['run', '--rm', '-v', `${this.options.outDir}:/var/task`, `lambci/lambda:build-nodejs${this.options.nodeVersion || 12}.x`, 'npm', 'install']
      : ['install'];

    const install = spawnSync(command, args, {
        cwd: this.options.outDir
    });

    if (install.error) {
      throw install.error;
    }

    if (install.status !== 0) {
      throw new Error(install.stderr.toString().trim());
    }
  }

  private restorePkg() {
    fs.writeFileSync(this.pkgPath, this.originalPkg);
  }
}

enum Installer {
  NPM = 'npm',
  YARN = 'yarn',
}

enum LockFile {
  NPM = 'package-lock.json',
  YARN = 'yarn.lock',
}
