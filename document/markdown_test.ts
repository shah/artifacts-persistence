import { contextMgr as cm, inflect } from "../deps.ts";
import { path, testingAsserts as ta } from "../deps-test.ts";
import * as io from "../io.ts";
import * as mod from "./mod.ts";
import { markdownTags as md } from "./mod.ts";

function testFilePath(relTestFileName: string): string {
  return path.join(
    path.relative(
      Deno.cwd(),
      path.dirname(import.meta.url).substr("file://".length),
    ),
    relTestFileName,
  );
}

Deno.test("Markdown Document Persistence", () => {
  const ph = new io.InMemoryPersistenceHandler();
  const ctx: cm.Context = {
    isContext: true,
    execEnvs: {
      isExecutionEnvironments: true,
      environmentsName: inflect.guessCaseValue("*_test.ts"),
    },
  };
  const mda = new mod.MarkdownArtifact();
  mda.frontmatter.property1 = "string";
  mda.frontmatter["Property 2"] = 100;
  mda.frontmatter.date = new Date("2020-10-10");
  mda.appendText(ctx, "Markdown content");
  ph.persistTextArtifact(ctx, "test.md", mda);

  ta.assertEquals(ph.results.length, 1, "Expected a single result");

  const golden = Deno.readTextFileSync(
    testFilePath("markdown_test-front-matter.md.golden"),
  );
  ta.assertEquals(ph.results[0].artifactText, golden);
});

Deno.test(`simple Markdown content generator`, () => {
  const exampleUrl =
    "https://github.com/skulptur/markdown-fns/tree/master/example";
  const fruits = ["Apples", "Oranges", "Bananas"];

  const span = md.htmlTagFn("span");
  const customTag = md.htmlTagFn("tag");

  const markdown = md.lines([
    md.frontMatterYAML({ title: "Generated Markdown" }),
    md.lines(
      md.times((index) => md.heading(index + 1, "This is a heading."), 6),
    ),
    "This is regular text.",
    md.italic("Italic text."),
    md.bold("Bold text."),
    md.strike("Strike through text."),
    md.lines([
      "More regular text.",
      md.spaces("Text and", md.inlineCode("inline code"), ":-)"),
      "and then some more text.",
    ]),
    md.ordered(fruits),
    md.unordered(fruits),
    md.link("example", exampleUrl),
    md.htmlTag("b", "HTML without params"),
    customTag("param", "HTML tag with simple param"),
    span({ style: "abc:xyz" }, "span HTML with key/value param"),
  ]);

  const golden = Deno.readTextFileSync(
    testFilePath("markdown_test-content.md.golden"),
  );
  ta.assertEquals(markdown, golden);
});
