import { contextMgr as cm, inflect, stdAsserts as ta } from "../deps.ts";
import * as io from "../io.ts";
import * as md from "./markdown.ts";
import {
  bold,
  frontMatterYAML,
  heading,
  htmlTag,
  htmlTagFn,
  inlineCode,
  italic,
  lines,
  link,
  ordered,
  spaces,
  strike,
  times,
  unordered,
} from "./markdown.ts";

Deno.test("Markdown Document Persistence", () => {
  const ph = new io.InMemoryPersistenceHandler();
  const ctx: cm.Context = {
    isContext: true,
    execEnvs: {
      isExecutionEnvironments: true,
      environmentsName: inflect.guessCaseValue("*_test.ts"),
    },
  };
  const mda = new md.MarkdownArtifact();
  mda.frontmatter.property1 = "string";
  mda.frontmatter["Property 2"] = 100;
  mda.frontmatter.date = new Date("2020-10-10");
  mda.appendText(ctx, "Markdown content");
  ph.persistTextArtifact(ctx, "test.md", mda);

  ta.assertEquals(ph.results.length, 1, "Expected a single result");

  const golden = io.readFileAsTextFromPaths(
    "markdown_test-simple.md.golden",
    [".", "document"], // might be run from module root or current folder
  );
  ta.assertEquals(ph.results[0].artifactText, golden);
});

const generatedMD = `---
title: Generated Markdown
---

# This is a heading.
## This is a heading.
### This is a heading.
#### This is a heading.
##### This is a heading.
###### This is a heading.
This is regular text.
***Italic text.***
**Bold text.**
~~Strike through text.~~
More regular text.
Text and \`inline code\` :-)
and then some more text.
  
1. Apples
2. Oranges
3. Bananas
  
* Apples
* Oranges
* Bananas
[example](https://github.com/skulptur/markdown-fns/tree/master/example)
<b>HTML without params</b>
<tag param>HTML tag with simple param</tag>
<span style="abc:xyz">span HTML with key/value param</span>
{{<todo assign="shah">}}an assignment{{</todo>}}`;

Deno.test(`simple Markdown content generator`, () => {
  const exampleUrl =
    "https://github.com/skulptur/markdown-fns/tree/master/example";
  const fruits = ["Apples", "Oranges", "Bananas"];

  const span = htmlTagFn("span");
  const customTag = htmlTagFn("tag");

  const markdown = lines([
    frontMatterYAML({ title: "Generated Markdown" }),
    lines(times((index) => heading(index + 1, "This is a heading."), 6)),
    "This is regular text.",
    italic("Italic text."),
    bold("Bold text."),
    strike("Strike through text."),
    lines([
      "More regular text.",
      spaces("Text and", inlineCode("inline code"), ":-)"),
      "and then some more text.",
    ]),
    ordered(fruits),
    unordered(fruits),
    link("example", exampleUrl),
    htmlTag("b", "HTML without params"),
    customTag("param", "HTML tag with simple param"),
    span({ style: "abc:xyz" }, "span HTML with key/value param"),
  ]);

  ta.assertEquals(markdown, generatedMD);
});
