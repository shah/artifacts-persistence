import { TextArtifactNature } from "../nature.ts";

export const jsonArtifact = new (class implements TextArtifactNature {
  readonly isTextArtifactNature = true;
  readonly name = "JSON";
  readonly defaultFileExtn: string = ".json";
  readonly fileExtensions: string[] = [this.defaultFileExtn];

  constructor() {}
})();
