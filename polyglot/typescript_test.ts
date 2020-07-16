import * as c from "../code.ts";
import { inflect, stdAsserts as a } from "../deps.ts";
import * as io from "../io.ts";
import * as ts from "./typescript.ts";

Deno.test("Transform CSV to TypeScript", async () => {
  const ph = new io.InMemoryPersistenceHandler();
  const code = new ts.TypeScriptArtifacts(ph);
  const module = new ts.TypeScriptModule(code, inflect.guessCaseValue("test"));
  code.declareModule(module);

  const intrf = new ts.TypeScriptInterface(
    module,
    inflect.guessCaseValue("Test Interface"),
  );
  module.declareInterface(intrf);
  intrf.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("First Name"),
      "string",
    ),
  );
  intrf.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("Last Name"),
      "string",
    ),
  );
  intrf.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("Numeric Property"),
      "number",
    ),
  );
  intrf.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("Birth Date"),
      "Date",
    ),
  );
  intrf.declareContent({
    "First Name": "Shahid",
    "Last Name": "Shah",
    "Numeric Property": 100,
    "Birth Date": new Date("1970-10-10"),
  });

  code.emit({
    isContext: true,
    execEnvs: {
      isExecutionEnvironments: true,
      environmentsName: inflect.guessCaseValue("*_test.ts"),
    },
  }, c.consolePolyglotErrorHandler);
  a.assertEquals(ph.results.length, 1, "Expected a single results");

  const golden = io.readFileAsTextFromPaths(
    "typescript_test-simple.ts.golden",
    [".", "polyglot"], // might be run from module root or current folder
  );
  a.assertEquals(ph.results[0].artifactText, golden);
});
