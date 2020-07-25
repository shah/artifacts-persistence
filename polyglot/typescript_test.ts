import * as c from "../code.ts";
import { inflect, stdAsserts as a } from "../deps.ts";
import * as io from "../io.ts";
import * as ts from "./typescript.ts";

Deno.test("TypeScript Polyglot Persistence", async () => {
  const ph = new io.InMemoryPersistenceHandler();
  const code = new ts.TypeScriptArtifacts(ph, {});
  const module1 = new ts.TypeScriptModule(
    code,
    inflect.guessCaseValue("module"),
  );
  code.declareModule(module1);

  const intrf1 = new ts.TypeScriptInterface(
    module1,
    inflect.guessCaseValue("Test Interface 1"),
    {},
  );
  module1.declareInterface(intrf1);
  intrf1.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("First Name"),
      "string",
    ),
  );
  intrf1.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("Last Name"),
      "string",
    ),
  );
  intrf1.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("Numeric Property"),
      "number",
    ),
  );
  intrf1.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("Birth Date"),
      "Date",
    ),
  );
  const intrf1Content = [{
    "First Name": "Shahid",
    "Last Name": "Shah",
    "Numeric Property": 100,
    "Birth Date": new Date("1970-10-10"),
  }, {
    "First Name": "Another",
    "Last Name": "Shusain",
    "Numeric Property": 200,
    "Birth Date": new Date("1990-07-14"),
  }];
  module1.declareContent(
    new ts.TypeScriptContent(
      inflect.guessCaseValue("Test Interface 1 Content"),
      intrf1,
      intrf1Content,
      {},
    ),
  );

  // create new module with same name to test single-file output
  const module2 = new ts.TypeScriptModule(
    code,
    inflect.guessCaseValue("module"),
  );
  code.declareModule(module2);

  const intrf2 = new ts.TypeScriptInterface(
    module1,
    inflect.guessCaseValue("Test Interface 2"),
    {},
  );
  module2.declareInterface(intrf2);
  intrf2.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("Text Property"),
      "string",
    ),
  );
  const intrf2Content = {
    "Text Property": "Test",
  };
  module2.declareContent(
    new ts.TypeScriptContent(
      inflect.guessCaseValue("Test Interface 2 Content"),
      intrf2,
      intrf2Content,
      {},
    ),
  );

  // create new module with same name to test single-file output
  const module3 = new ts.TypeScriptModule(
    code,
    inflect.guessCaseValue("module"),
  );
  code.declareModule(module3);

  const intrf3 = new ts.TypeScriptInterface(
    module1,
    inflect.guessCaseValue("Test Interface 3"),
    {},
  );
  module3.declareInterface(intrf3);
  const testIntrf1Prop = intrf3.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("Test Interface 1 Property"),
      intrf1,
    ),
  );
  const testIntrf2Prop = intrf3.declareProperty(
    new ts.TypicalTypeScriptProperty(
      inflect.guessCaseValue("Test Interface 2 Property"),
      intrf2,
    ),
  );
  module3.declareContent(
    new ts.TypeScriptContent(
      inflect.guessCaseValue("Test Interface 3 Content"),
      intrf3,
      {
        testInterface1Property: intrf1Content,
        testInterface2Property: intrf2Content,
      },
      { moduleExport: true, moduleDefault: true },
    ),
  );

  code.emit(
    {
      isContext: true,
      execEnvs: {
        isExecutionEnvironments: true,
        environmentsName: inflect.guessCaseValue("*_test.ts"),
      },
    },
    c.consolePolyglotErrorHandler,
    { appendIfExists: true, appendDelim: "\n" },
  );
  a.assertEquals(ph.results.length, 1, "Expected a single result");

  const golden = io.readFileAsTextFromPaths(
    "typescript_test-simple.ts.golden",
    [".", "polyglot"], // might be run from module root or current folder
  );
  a.assertEquals(ph.results[0].artifactText, golden);
});
