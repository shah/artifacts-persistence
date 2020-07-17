import { contextMgr as cm, inflect, stdAsserts as a } from "../deps.ts";
import * as io from "../io.ts";
import * as md from "./markdown.ts";

Deno.test("Markdown Document Persistence", async () => {
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

  a.assertEquals(ph.results.length, 1, "Expected a single result");

  const golden = io.readFileAsTextFromPaths(
    "markdown_test-simple.md.golden",
    [".", "document"], // might be run from module root or current folder
  );
  a.assertEquals(ph.results[0].artifactText, golden);
});
