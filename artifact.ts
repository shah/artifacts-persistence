import { StringWriter } from "https://deno.land/std@v0.60.0/io/mod.ts";
import { Context } from "https://cdn.jsdelivr.net/gh/shah/context-manager/mod.ts";
import { TextWriter, Writer } from "./io.ts";
import {
  resolveTextValue,
  TextValue,
} from "https://cdn.jsdelivr.net/gh/shah/value-manager/mod.ts";
import { TextArtifactNature } from "./nature.ts";

export interface Artifact {
  readonly isArtifact: true;
}

export interface TextArtifact extends Artifact {
  readonly isTextArtifact: true;
  readonly nature: TextArtifactNature;
  text(ctx: Context): string;
  textFragment(ctx: Context): string;
}

export function isTextArtifact(o: any): o is TextArtifact {
  return "isTextArtifact" in o;
}

export interface MutableTextArtifact extends TextArtifact {
  readonly isMutableTextArtifact: true;
  readonly options: MutableTextArtifactOptions;
  appendText(ctx: Context, content: string | TextWriter): void;
}

export function isMutableTextArtifact(o: any): o is MutableTextArtifact {
  return "isMutableTextArtifact" in o;
}

export interface MutableTextArtifactOptions {
  readonly nature: TextArtifactNature;
  readonly preamble?: TextValue;
}

export class DefaultTextArtifact implements MutableTextArtifact {
  readonly isArtifact = true;
  readonly isTextArtifact = true;
  readonly nature: TextArtifactNature;
  readonly isMutableTextArtifact = true;

  protected readonly writer: Writer = new StringWriter();

  constructor(readonly options: MutableTextArtifactOptions) {
    this.nature = options.nature;
  }

  appendText(ctx: Context, content: string | TextWriter): void {
    const te = new TextEncoder();
    switch (typeof content) {
      case "string":
        this.writer.write(te.encode(content));
        break;

      case "function":
        content(ctx, this.writer, te);
    }
  }

  text(ctx: Context): string {
    const sw = this.writer as StringWriter;
    const preamble = this.options.preamble
      ? resolveTextValue(ctx, this.options.preamble)
      : this.nature.defaultPreamble
      ? resolveTextValue(ctx, this.nature.defaultPreamble)
      : undefined;
    const text = this.writer.toString();
    return preamble ? preamble + this.writer.toString() : text;
  }

  textFragment(ctx: Context): string {
    return this.writer.toString();
  }
}
