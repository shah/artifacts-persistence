import { Artifact, isTextArtifact } from "./artifact.ts";
import { contextMgr as cm, stdPath as path, valueMgr as vm } from "./deps.ts";

export interface ArtifactNamingParams {
  readonly artifact: Artifact;
  readonly suggestedName: vm.TextValue;
  readonly fileIndex: number;
}

export interface ArtifactNamingStrategy {
  (ctx: cm.Context, params: ArtifactNamingParams): string;
}

export function asIsNamingStrategy(
  ctx: cm.Context,
  params: ArtifactNamingParams,
): string {
  return vm.resolveTextValue(ctx, params.suggestedName);
}

export function defaultExtensionNamingStrategy(
  extn: vm.TextValue,
): ArtifactNamingStrategy {
  return (
    ctx: cm.Context,
    params: ArtifactNamingParams,
  ): string => {
    const suggestNameResolved = vm.resolveTextValue(ctx, params.suggestedName);
    const hasExtension = path.extname(suggestNameResolved) != "";
    if (!hasExtension) {
      return suggestNameResolved + vm.resolveTextValue(ctx, extn);
    }
    return suggestNameResolved;
  };
}

export function natureNamingStrategy(
  otherwise?: ArtifactNamingStrategy,
): ArtifactNamingStrategy {
  return (
    ctx: cm.Context,
    params: ArtifactNamingParams,
  ): string => {
    if (!isTextArtifact(params.artifact)) {
      return otherwise
        ? otherwise(ctx, params)
        : asIsNamingStrategy(ctx, params);
    }

    const suggestNameResolved = vm.resolveTextValue(ctx, params.suggestedName);
    const hasExtension = path.extname(suggestNameResolved) != "";
    if (!hasExtension) {
      return suggestNameResolved +
        vm.resolveTextValue(ctx, params.artifact.nature.defaultFileExtn);
    }
    return suggestNameResolved;
  };
}

export interface SequenceNumberSupplier {
  (ctx: cm.Context, params: ArtifactNamingParams): number;
}

export interface SequenceNumberFormatter {
  (
    ctx: cm.Context,
    params: ArtifactNamingParams,
    sns: SequenceNumberSupplier,
  ): string;
}

export function asIsSequenceNumberSupplier(
  ctx: cm.Context,
  params: ArtifactNamingParams,
): number {
  return params.fileIndex;
}

export function startAtSequenceNumberSupplier(
  startIndex: number,
): SequenceNumberSupplier {
  return (
    ctx: cm.Context,
    params: ArtifactNamingParams,
  ): number => {
    return startIndex + params.fileIndex;
  };
}

export function threeDigitSeqNumFormatter(
  ctx: cm.Context,
  params: ArtifactNamingParams,
  sns: SequenceNumberSupplier,
): string {
  const sequence = sns(ctx, params);
  return sequence.toString().padStart(3, "0");
}

export function sequencePrefixNamingStrategy(
  wrap: ArtifactNamingStrategy,
  sns: SequenceNumberSupplier = asIsSequenceNumberSupplier,
  snf: SequenceNumberFormatter = threeDigitSeqNumFormatter,
): ArtifactNamingStrategy {
  return (
    ctx: cm.Context,
    params: ArtifactNamingParams,
  ): string => {
    const suggested = wrap(ctx, params);
    return `${snf(ctx, params, sns)}_${suggested}`;
  };
}

export function fileNameIsJustAnExtension(fileName: string): boolean {
  return (
    fileName.startsWith(".") &&
    !(fileName.startsWith("./") || fileName.startsWith(".\\"))
  );
}

export function appendExtnNamingStrategy(
  sourceFile: string,
  destFile: string,
): ArtifactNamingStrategy {
  if (fileNameIsJustAnExtension(destFile)) {
    return (
      ctx: cm.Context,
      params: ArtifactNamingParams,
    ): string => {
      return path.basename(sourceFile) + destFile;
    };
  }
  return asIsNamingStrategy;
}
