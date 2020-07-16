import { contextMgr as cm, inflect } from "./deps.ts";

export type PolyglotErrorMessage = string;
export type PolyglotIdentifier = string;

export interface PolyglotErrorHandler {
  reportError(
    code: PolyglotCodeArtifacts,
    message: PolyglotErrorMessage,
  ): void;
}

export const consolePolyglotErrorHandler = {
  reportError(
    code: PolyglotCodeArtifacts,
    message: PolyglotErrorMessage,
  ): void {
    console.error(message);
  },
};

export interface PolyglotCodeArtifactsOptions {
}

export interface PolyglotCodeArtifacts extends PolyglotCodeArtifactsOptions {
  declareModule(module: PolyglotModuleDecl): void;
  emit(ctx: cm.Context, eh: PolyglotErrorHandler): void;
}

export interface PolyglotModuleDeclOptions {
}

export interface PolyglotModuleDecl extends PolyglotModuleDeclOptions {
  readonly name: inflect.InflectableValue;
  declareInterface(intf: PolyglotInterfaceDecl): void;
}

export interface PolyglotInterfaceDeclOptions {
}

export interface PolyglotInterfaceDecl extends PolyglotInterfaceDeclOptions {
  readonly name: inflect.InflectableValue;
  declareProperty(prop: PolyglotPropertyDecl): void;
  declareContent(content: object): void;
}

export interface PolyglotPropertyDeclOptions {
}

export interface PolyglotPropertyDecl extends PolyglotPropertyDeclOptions {
  getInterfaceDecl(
    ctx: cm.Context,
    eh: PolyglotErrorHandler,
  ): string | undefined;
  getContentDecl(
    ctx: cm.Context,
    content: object,
    eh: PolyglotErrorHandler,
  ): string | undefined;
}
