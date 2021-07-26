import {
  DefaultTextArtifact,
  MutableTextArtifact,
  MutableTextArtifactOptions,
  TextArtifact,
} from "./artifact.ts";
import {
  contextMgr as cm,
  safety,
  stdFS as fs,
  stdPath as path,
  valueMgr as vm,
} from "./deps.ts";
import { ArtifactNamingStrategy, asIsNamingStrategy } from "./naming.ts";

export type Reader = Deno.Reader;
export type Writer = Deno.Writer;

export interface PersistenceResult {
  readonly origArtifactName: vm.TextValue;
  readonly finalArtifactNameLogical: string;
  readonly finalArtifactNamePhysical: string;
  readonly finalArtifactNamePhysicalAbs: string;
  readonly finalArtifactNamePhysicalRel: string;
  readonly overwroteExisting: PersistenceResult[];
  readonly artifactText: string;
  readonly artifacts: TextArtifact[];
}

export interface PeristenceReporter {
  (
    ctx: cm.Context,
    ph: PersistenceHandler,
    result: PersistenceResult | string,
  ): void;
}

export function consolePersistenceResultReporter(
  _ctx: cm.Context,
  _ph: PersistenceHandler,
  result: PersistenceResult | string,
): void {
  console.log(
    typeof result === "string"
      ? result
      : `${result.finalArtifactNamePhysicalRel} (${
        result.artifacts.length > 1
          ? "append"
          : (result.overwroteExisting.length > 0 ? "overwrote" : "new")
      })`,
  );
}

export enum PeristenceErrorCode {
  DestinationPathNotFound = 100,
}

export interface PeristenceErrorHandler {
  (
    ctx: cm.Context,
    ph: PersistenceHandler,
    artifactName: vm.TextValue,
    artifact: TextArtifact,
    code: number,
    message: string,
  ): void;
}

export interface TextWriter {
  (ctx: cm.Context, writer: Writer, te?: TextEncoder): void;
}

export interface PersistArtifactOptions {
  readonly appendIfExists?: boolean;
  readonly appendDelim?: vm.TextValue;
  readonly logicalNamingStrategy?: ArtifactNamingStrategy;
  readonly physicalNamingStrategy?: ArtifactNamingStrategy;
  readonly chmod?: number;
}

export interface PersistenceDestAs {
  readonly persistOptions?: PersistArtifactOptions;
  readonly persistAsName: vm.TextValue;
}

export interface PersistenceDestinationSupplier {
  readonly isPersistenceDestinationSupplier: true;
  readonly persistDestAs: PersistenceDestAs;
}

export const isPersistenceDestinationSupplier = safety.typeGuard<
  PersistenceDestinationSupplier
>(
  "isPersistenceDestinationSupplier",
);

export interface PersistenceHandler {
  readonly results: PersistenceResult[];
  readonly resultsMap: Map<string, PersistenceResult>;

  createMutableTextArtifact(
    ctx: cm.Context,
    options: MutableTextArtifactOptions,
  ): MutableTextArtifact;
  persistTextArtifact(
    ctx: cm.Context,
    artifactName: vm.TextValue,
    artifact: TextArtifact,
    options?: PersistArtifactOptions,
  ): PersistenceResult | undefined;
  handleError(
    ctx: cm.Context,
    artifactName: vm.TextValue,
    artifact: TextArtifact,
    code: number,
    message: string,
  ): void;
}

export interface FileSystemPersistenceOptions {
  readonly projectPath: string;
  readonly destPath: string;
  readonly logicalNamingStrategy?: ArtifactNamingStrategy;
  readonly physicalNamingStrategy?: ArtifactNamingStrategy;
  readonly createDestPaths?: boolean;
  readonly forFileName?: string;
  readonly report?: PeristenceReporter;
  readonly dryRun?: boolean;
  readonly errorHandler?: PeristenceErrorHandler;
}

export class FileSystemPersistenceHandler implements PersistenceHandler {
  readonly logicalNamingStrategy: ArtifactNamingStrategy;
  readonly physicalNamingStrategy: ArtifactNamingStrategy;
  readonly results: PersistenceResult[] = [];
  readonly resultsMap: Map<string, PersistenceResult> = new Map();

  constructor(readonly fspOptions: FileSystemPersistenceOptions) {
    if (!this.fspOptions.dryRun && fspOptions.createDestPaths) {
      fs.ensureDirSync(fspOptions.destPath);
    }
    this.logicalNamingStrategy = fspOptions.logicalNamingStrategy
      ? fspOptions.logicalNamingStrategy
      : (fspOptions.physicalNamingStrategy || asIsNamingStrategy);
    this.physicalNamingStrategy = fspOptions.physicalNamingStrategy
      ? fspOptions.physicalNamingStrategy
      : (fspOptions.logicalNamingStrategy || asIsNamingStrategy);
  }

  protected chmod(
    ctx: cm.Context,
    finalPhysicalAbs: string,
    artifactName: vm.TextValue,
    artifact: TextArtifact,
    ptaOptions?: PersistArtifactOptions,
  ): void {
    if (ptaOptions && ptaOptions.chmod != undefined) {
      try {
        Deno.chmodSync(
          finalPhysicalAbs,
          ptaOptions.chmod,
        );
      } catch (e) {
        this.handleError(
          ctx,
          artifactName,
          artifact,
          9999,
          `Unable to chmod ${finalPhysicalAbs} with ${ptaOptions.chmod}: ${e}`,
        );
      }
    }
  }

  createMutableTextArtifact(
    _ctx: cm.Context,
    options: MutableTextArtifactOptions,
  ): MutableTextArtifact {
    return new DefaultTextArtifact(options);
  }

  public persistTextArtifact(
    ctx: cm.Context,
    artifactName: vm.TextValue,
    artifact: TextArtifact,
    ptaOptions?: PersistArtifactOptions,
  ): PersistenceResult | undefined {
    const namingParams = {
      artifact: artifact,
      fileIndex: this.results.length,
    };
    const logicalNS = ptaOptions?.logicalNamingStrategy
      ? ptaOptions.logicalNamingStrategy
      : this.logicalNamingStrategy;
    const physicalNS = ptaOptions?.physicalNamingStrategy
      ? ptaOptions.physicalNamingStrategy
      : this.physicalNamingStrategy;
    const finalLogical = logicalNS(
      ctx,
      { suggestedName: artifactName, ...namingParams },
    );
    const finalPhysical = physicalNS(
      ctx,
      { suggestedName: finalLogical, ...namingParams },
    );
    const finalPhysicalRel = path.join(this.fspOptions.destPath, finalPhysical);
    const finalPhysicalAbs = this.fspOptions.destPath
      ? path.resolve(finalPhysicalRel)
      : finalPhysical;
    const resultsMapKey = finalLogical;
    const destPath = path.dirname(finalPhysicalAbs);
    if (!fs.existsSync(destPath)) {
      if (this.fspOptions.createDestPaths) {
        if (!this.fspOptions.dryRun) {
          fs.ensureDirSync(destPath);
        } else if (this.fspOptions.dryRun && this.fspOptions.report) {
          this.fspOptions.report(
            ctx,
            this,
            `Need to create path ${destPath} for storing ${finalPhysicalRel}`,
          );
        }
      } else {
        this.handleError(
          ctx,
          artifactName,
          artifact,
          PeristenceErrorCode.DestinationPathNotFound.valueOf(),
          `${destPath} not found, ${
            this.fspOptions.dryRun ? "will not be able" : "unable"
          } to create ${finalPhysicalRel}`,
        );
        return undefined;
      }
    }
    let text = artifact.text(ctx);
    let activePR = this.resultsMap.get(resultsMapKey);
    if (activePR && (ptaOptions && ptaOptions.appendIfExists)) {
      if (!this.fspOptions.dryRun) {
        const existingContent = Deno.readTextFileSync(
          activePR.finalArtifactNamePhysicalAbs,
        );
        text = artifact.textFragment(ctx);
        const appendDelim = ptaOptions.appendDelim
          ? vm.resolveTextValue(ctx, ptaOptions.appendDelim)
          : "";
        Deno.writeTextFileSync(
          activePR.finalArtifactNamePhysicalAbs,
          existingContent + appendDelim + text,
        );
        this.chmod(
          ctx,
          activePR.finalArtifactNamePhysicalAbs,
          artifactName,
          artifact,
          ptaOptions,
        );
      }
      activePR.artifacts.push(artifact);
    } else {
      if (!this.fspOptions.dryRun) {
        Deno.writeTextFileSync(finalPhysicalAbs, text);
        this.chmod(
          ctx,
          finalPhysicalAbs,
          artifactName,
          artifact,
          ptaOptions,
        );
      }
      activePR = {
        origArtifactName: artifactName,
        finalArtifactNameLogical: finalLogical,
        finalArtifactNamePhysical: finalPhysical,
        finalArtifactNamePhysicalAbs: finalPhysicalAbs,
        finalArtifactNamePhysicalRel: path.relative(
          this.fspOptions.projectPath,
          finalPhysicalRel,
        ),
        overwroteExisting: activePR
          ? [...activePR.overwroteExisting, activePR]
          : [],
        artifactText: text,
        artifacts: [artifact],
      };
      this.resultsMap.set(resultsMapKey, activePR);
      this.results.push(activePR);
    }
    if (this.fspOptions.report) {
      this.fspOptions.report(ctx, this, activePR);
    }
    return activePR;
  }

  handleError(
    ctx: cm.Context,
    artifactName: vm.TextValue,
    artifact: TextArtifact,
    code: number,
    message: string,
  ): void {
    if (this.fspOptions.errorHandler) {
      this.fspOptions.errorHandler(
        ctx,
        this,
        artifactName,
        artifact,
        code,
        message,
      );
    } else {
      console.error(`[${code}] ${message}`);
    }
  }
}

export class InMemoryPersistenceHandler implements PersistenceHandler {
  readonly results: PersistenceResult[] = [];
  readonly resultsMap: Map<string, PersistenceResult> = new Map();

  constructor(
    readonly logicalNamingStrategy: ArtifactNamingStrategy = asIsNamingStrategy,
  ) {}

  createMutableTextArtifact(
    _ctx: cm.Context,
    options: MutableTextArtifactOptions,
  ): MutableTextArtifact {
    return new DefaultTextArtifact(options);
  }

  protected replaceResult(
    key: string,
    existing: PersistenceResult,
    replaceWith: PersistenceResult,
  ): PersistenceResult {
    const foundIndex = this.results.findIndex((pr) => pr == existing);
    this.resultsMap.set(key, replaceWith);
    if (foundIndex >= 0) {
      this.results[foundIndex] = replaceWith;
    }
    return replaceWith;
  }

  public persistTextArtifact(
    ctx: cm.Context,
    artifactName: vm.TextValue,
    artifact: TextArtifact,
    options?: PersistArtifactOptions,
  ): PersistenceResult {
    const finalLogical = this.logicalNamingStrategy(ctx, {
      artifact: artifact,
      suggestedName: artifactName,
      fileIndex: this.results.length,
    });
    const exists = this.resultsMap.get(finalLogical);
    if (!exists) {
      const pr = {
        origArtifactName: artifactName,
        finalArtifactNameLogical: finalLogical,
        finalArtifactNamePhysical: finalLogical,
        finalArtifactNamePhysicalRel: finalLogical,
        finalArtifactNamePhysicalAbs: finalLogical,
        artifactText: artifact.text(ctx),
        artifacts: [artifact],
        overwroteExisting: [],
      };
      this.resultsMap.set(finalLogical, pr);
      this.results.push(pr);
      return pr;
    } else {
      if (options?.appendIfExists) {
        const appendDelim = options?.appendDelim
          ? vm.resolveTextValue(ctx, options?.appendDelim)
          : "";
        return this.replaceResult(finalLogical, exists, {
          ...exists,
          artifactText: exists.artifactText + appendDelim +
            artifact.textFragment(ctx),
          artifacts: [...exists.artifacts, artifact],
        });
      } else {
        return this.replaceResult(finalLogical, exists, {
          origArtifactName: artifactName,
          finalArtifactNameLogical: finalLogical,
          finalArtifactNamePhysical: finalLogical,
          finalArtifactNamePhysicalRel: finalLogical,
          finalArtifactNamePhysicalAbs: finalLogical,
          artifactText: artifact.text(ctx),
          artifacts: [artifact],
          overwroteExisting: [exists],
        });
      }
    }
  }

  handleError(
    _ctx: cm.Context,
    artifactName: vm.TextValue,
    _artifact: TextArtifact,
    code: number,
    message: string,
  ): void {
    console.error(`[${code}] ${message} (${artifactName})`);
  }
}

export class ConsolePersistenceHandler implements PersistenceHandler {
  readonly results: PersistenceResult[] = [];
  readonly resultsMap: Map<string, PersistenceResult> = new Map();

  constructor() {}

  createMutableTextArtifact(
    _ctx: cm.Context,
    options: MutableTextArtifactOptions,
  ): MutableTextArtifact {
    return new DefaultTextArtifact(options);
  }

  public persistTextArtifact(
    ctx: cm.Context,
    artifactName: vm.TextValue,
    artifact: TextArtifact,
    _options?: PersistArtifactOptions,
  ): PersistenceResult {
    console.log(artifact.text(ctx));
    const finalLogical = vm.resolveTextValue(ctx, artifactName);
    const exists = this.resultsMap.get(finalLogical);
    if (!exists) {
      const pr = {
        origArtifactName: artifactName,
        finalArtifactNameLogical: finalLogical,
        finalArtifactNamePhysical: finalLogical,
        finalArtifactNamePhysicalRel: finalLogical,
        finalArtifactNamePhysicalAbs: finalLogical,
        artifactText: artifact.text(ctx),
        artifacts: [artifact],
        overwroteExisting: [],
      };
      this.resultsMap.set(finalLogical, pr);
      this.results.push(pr);
      return pr;
    } else {
      const pr = {
        ...exists,
        artifactText: exists.artifactText + artifact.textFragment(ctx),
        artifacts: [...exists.artifacts, artifact],
      };
      this.resultsMap.set(finalLogical, pr);
      return pr;
    }
  }

  handleError(
    _ctx: cm.Context,
    artifactName: vm.TextValue,
    _artifact: TextArtifact,
    code: number,
    message: string,
  ): void {
    console.error(`[${code}] ${message} (${artifactName})`);
  }
}

export const consolePersistenceHandler = new ConsolePersistenceHandler();

export function readFileAsTextFromPaths(
  fileName: string,
  pathsToCheck: string[],
): string | undefined {
  const decoder = new TextDecoder("utf-8");
  for (const ptc of pathsToCheck) {
    try {
      return decoder.decode(Deno.readFileSync(path.join(ptc, fileName)));
    } catch (_) {
      // the file wasn't found, eat the error for now because we'll
      // try multiple directories
    }
  }
  return undefined;
}
