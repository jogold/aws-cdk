import {spawnSync } from 'child_process';

interface InstallerOptions {
  readonly lockFile: string;
  readonly cacheGet: string[];
  readonly cacheEnv: string;
  readonly configEnv?: { [key: string]: string };
}

/**
 * A node module installer
 */
export class Installer {
  public static readonly NPM = new Installer('npm', {
    lockFile: 'package-lock.json',
    cacheGet: ['config', 'get', 'cache'],
    cacheEnv: 'npm_config_cache',
    configEnv: {
      'npm_config_loglevel': 'error', // Do not show WARN messages
      'npm_config_update-notifier': 'false', // Do not check for updates
    },
  });

  public static readonly YARN = new Installer('yarn', {
    lockFile: 'yarn.lock',
    cacheGet: ['cache', 'dir'],
    cacheEnv: 'YARN_CACHE_FOLDER',
  });

  public readonly command: string;

  public readonly options: InstallerOptions;

  constructor(command: string, options: InstallerOptions) {
    this.command = command;
    this.options = options;
  }

  public get cachePath(): string | undefined {
    try {
      const proc = spawnSync(this.command, this.options.cacheGet);

      if (proc.status !== 0) {
        return undefined;
      }

      return proc.stdout.toString().trim();
    } catch (err) {
      return undefined;
    }
  }
}
