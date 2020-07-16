import { valueMgr as vm } from "./deps.ts";

export interface TextArtifactNature {
  readonly isTextArtifactNature: true;
  readonly name: string;
  readonly fileExtensions: string[];
  readonly defaultFileExtn: string;
  readonly defaultPreamble?: vm.TextValue;
}
