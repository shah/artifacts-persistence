import * as fs from "https://deno.land/std@v0.61.0/fs/mod.ts";
import {
  readFileStrSync,
  writeFileStrSync,
} from "https://deno.land/std@v0.61.0/fs/mod.ts";
import * as path from "https://deno.land/std@v0.61.0/path/mod.ts";
import {
  DefaultTextArtifact,
  MutableTextArtifact,
  MutableTextArtifactOptions,
  TextArtifact,
} from "./artifact.ts";
import {
  ArtifactNamingStrategy,
  asIsNamingStrategy,
} from "./naming.ts";
import { Context } from "https://cdn.jsdelivr.net/gh/shah/context-manager@v1.0.1/mod.ts";
import {
  resolveTextValue,
  TextValue,
} from "https://cdn.jsdelivr.net/gh/shah/value-manager@v1.0.1/mod.ts";

export type Reader = Deno.Reader;
export type Writer = Deno.Writer;

export interface PersistenceResult {
  readonly origArtifactName: TextValue;
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
    ctx: Context,
    ph: PersistenceHandler,
    result: PersistenceResult | string,
  ): void;
}

export function consolePersistenceResultReporter(
  ctx: Context,
  ph: PersistenceHandler,
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
    ctx: Context,
    ph: PersistenceHandler,
    artifactName: TextValue,
    artifact: TextArtifact,
    code: number,
    message: string,
  ): void;
}

export interface TextWriter {
  (ctx: Context, writer: Writer, te?: TextEncoder): void;
}

export interface PersistArtifactOptions {
  readonly appendIfExists?: boolean;
  readonly appendDelim?: string;
  readonly logicalNamingStrategy?: ArtifactNamingStrategy;
  readonly physicalNamingStrategy?: ArtifactNamingStrategy;
  readonly chmod?: number;
}

export interface PersistenceDestAs {
  readonly persistOptions?: PersistArtifactOptions;
  readonly persistAsName: TextValue;
}

export interface PersistenceDestinationSupplier {
  readonly isPersistenceDestinationSupplier: true;
  readonly persistDestAs: PersistenceDestAs;
}

export function isPersistenceDestinationSupplier(
  o: object,
): o is PersistenceDestinationSupplier {
  return "isPersistenceDestinationSupplier" in o;
}

export interface PersistenceHandler {
  readonly results: PersistenceResult[];
  readonly resultsMap: Map<string, PersistenceResult>;

  createMutableTextArtifact(
    ctx: Context,
    options: MutableTextArtifactOptions,
  ): MutableTextArtifact;
  persistTextArtifact(
    ctx: Context,
    artifactName: TextValue,
    artifact: TextArtifact,
    options?: PersistArtifactOptions,
  ): PersistenceResult | undefined;
  handleError(
    ctx: Context,
    artifactName: TextValue,
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
    ctx: Context,
    finalPhysicalAbs: string,
    artifactName: TextValue,
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
    ctx: Context,
    options: MutableTextArtifactOptions,
  ): MutableTextArtifact {
    return new DefaultTextArtifact(options);
  }

  public persistTextArtifact(
    ctx: Context,
    artifactName: TextValue,
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
        const existingContent = readFileStrSync(
          activePR.finalArtifactNamePhysicalAbs,
        );
        text = artifact.textFragment(ctx);
        writeFileStrSync(
          activePR.finalArtifactNamePhysicalAbs,
          existingContent + (ptaOptions.appendDelim
            ? ptaOptions.appendDelim
            : "") +
            text,
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
      const overwroteExisting = activePR ? true : false;
      if (!this.fspOptions.dryRun) {
        writeFileStrSync(finalPhysicalAbs, text);
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
    ctx: Context,
    artifactName: TextValue,
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
    ctx: Context,
    options: MutableTextArtifactOptions,
  ): MutableTextArtifact {
    return new DefaultTextArtifact(options);
  }

  public persistTextArtifact(
    ctx: Context,
    artifactName: TextValue,
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
    ctx: Context,
    artifactName: TextValue,
    artifact: TextArtifact,
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
    ctx: Context,
    options: MutableTextArtifactOptions,
  ): MutableTextArtifact {
    return new DefaultTextArtifact(options);
  }

  public persistTextArtifact(
    ctx: Context,
    artifactName: TextValue,
    artifact: TextArtifact,
    options?: PersistArtifactOptions,
  ): PersistenceResult {
    console.log(artifact.text(ctx));
    const finalLogical = resolveTextValue(ctx, artifactName);
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
    ctx: Context,
    artifactName: TextValue,
    artifact: TextArtifact,
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
    } catch (e) {
      // the file wasn't found, eat the error for now because we'll
      // try multiple directories
    }
  }
  return undefined;
}
