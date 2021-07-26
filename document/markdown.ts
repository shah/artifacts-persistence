import { contextMgr as cm, stdEncodeYAML as yaml, stdIO } from "../deps.ts";
import type { TextWriter, Writer } from "../io.ts";
import type { TextArtifactNature } from "../nature.ts";

export interface Frontmatter {
  [key: string]: unknown;
}

export const markdownArtifact = new (class implements TextArtifactNature {
  readonly isTextArtifactNature = true;
  readonly name = "Markdown";
  readonly defaultFileExtn: string = ".md";
  readonly fileExtensions: string[] = [this.defaultFileExtn];

  constructor() {}
})();

export class MarkdownArtifact {
  readonly isArtifact = true;
  readonly isTextArtifact = true;
  readonly isMutableTextArtifact = true;

  protected readonly writer: Writer = new stdIO.StringWriter();

  constructor(
    readonly frontmatter: Frontmatter = {},
    readonly nature: TextArtifactNature = markdownArtifact,
  ) {
  }

  appendText(ctx: cm.Context, content: string | TextWriter): void {
    const te = new TextEncoder();
    switch (typeof content) {
      case "string":
        this.writer.write(te.encode(content));
        break;

      case "function":
        content(ctx, this.writer, te);
    }
  }

  text(_ctx: cm.Context): string {
    const _sw = this.writer as stdIO.StringWriter;
    const frontmatter = Object.keys(this.frontmatter).length > 0
      ? yaml.stringify(this.frontmatter)
      : undefined;
    const text = this.writer.toString();
    return frontmatter ? ("---\n" + frontmatter + "---\n" + text) : text;
  }

  textFragment(_ctx: cm.Context): string {
    return this.writer.toString();
  }
}
