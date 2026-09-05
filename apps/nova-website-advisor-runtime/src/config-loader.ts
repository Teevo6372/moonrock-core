import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import {
  validateStagingConfig,
  type StagingRuntimeConfig,
} from "./staging-config.js";

export class ConfigurationLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationLoadError";
  }
}

export function loadStagingConfigFile(
  path: string,
  options: { allowedRoot: string; maxBytes?: number },
): StagingRuntimeConfig {
  const allowedRoot = realpathSync(options.allowedRoot);
  const requested = realpathSync(resolve(path));
  // path.relative + a ".." / absolute-result check is the portable way to
  // test containment - a hardcoded "/" separator (the previous approach)
  // never matches on Windows, where realpathSync returns backslash-separated
  // paths, so every legitimately-inside path was wrongly rejected there.
  const relativePath = relative(allowedRoot, requested);
  const isInsideAllowedRoot = requested === allowedRoot || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
  if (!isInsideAllowedRoot) {
    throw new ConfigurationLoadError("Configuration path is outside the allowed root");
  }
  const size = statSync(requested).size;
  if (size > (options.maxBytes ?? 65_536)) {
    throw new ConfigurationLoadError("Configuration file exceeds the size limit");
  }
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(requested, "utf8")) as unknown;
  } catch {
    throw new ConfigurationLoadError("Configuration file must contain valid JSON");
  }
  return validateStagingConfig(value);
}
