import * as path from "https://deno.land/std@v0.60.0/path/mod.ts";
import { Context } from "https://cdn.jsdelivr.net/gh/shah/context-manager/mod.ts";
import {
  resolveTextValue,
  TextValue,
} from "https://cdn.jsdelivr.net/gh/shah/value-manager/mod.ts";
import { Artifact, isTextArtifact } from "./artifact.ts";

export interface ArtifactNamingParams {
  readonly artifact: Artifact;
  readonly suggestedName: TextValue;
  readonly fileIndex: number;
}

export interface ArtifactNamingStrategy {
  (ctx: Context, params: ArtifactNamingParams): string;
}

export function asIsNamingStrategy(
  ctx: Context,
  params: ArtifactNamingParams,
): string {
  return resolveTextValue(ctx, params.suggestedName);
}

export function defaultExtensionNamingStrategy(
  extn: TextValue,
): ArtifactNamingStrategy {
  return (
    ctx: Context,
    params: ArtifactNamingParams,
  ): string => {
    const suggestNameResolved = resolveTextValue(ctx, params.suggestedName);
    const hasExtension = path.extname(suggestNameResolved) != "";
    if (!hasExtension) {
      return suggestNameResolved + resolveTextValue(ctx, extn);
    }
    return suggestNameResolved;
  };
}

export function natureNamingStrategy(
  otherwise?: ArtifactNamingStrategy,
): ArtifactNamingStrategy {
  return (
    ctx: Context,
    params: ArtifactNamingParams,
  ): string => {
    if (!isTextArtifact(params.artifact)) {
      return otherwise
        ? otherwise(ctx, params)
        : asIsNamingStrategy(ctx, params);
    }

    const suggestNameResolved = resolveTextValue(ctx, params.suggestedName);
    const hasExtension = path.extname(suggestNameResolved) != "";
    if (!hasExtension) {
      return suggestNameResolved +
        resolveTextValue(ctx, params.artifact.nature.defaultFileExtn);
    }
    return suggestNameResolved;
  };
}

export interface SequenceNumberSupplier {
  (ctx: Context, params: ArtifactNamingParams): number;
}

export interface SequenceNumberFormatter {
  (
    ctx: Context,
    params: ArtifactNamingParams,
    sns: SequenceNumberSupplier,
  ): string;
}

export function asIsSequenceNumberSupplier(
  ctx: Context,
  params: ArtifactNamingParams,
): number {
  return params.fileIndex;
}

export function startAtSequenceNumberSupplier(
  startIndex: number,
): SequenceNumberSupplier {
  return (
    ctx: Context,
    params: ArtifactNamingParams,
  ): number => {
    return startIndex + params.fileIndex;
  };
}

export function threeDigitSeqNumFormatter(
  ctx: Context,
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
    ctx: Context,
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
      ctx: Context,
      params: ArtifactNamingParams,
    ): string => {
      return path.basename(sourceFile) + destFile;
    };
  }
  return asIsNamingStrategy;
}
