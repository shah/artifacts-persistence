import type { contextMgr as cm, inflect } from "./deps.ts";
import { safety } from "./deps.ts";
import type { PersistArtifactOptions } from "./io.ts";

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
  readonly autoFormat?: boolean;
}

export interface PolyglotCodeArtifacts extends PolyglotCodeArtifactsOptions {
  declareModule(module: PolyglotModuleDecl): PolyglotModuleDecl;
  emit(
    ctx: cm.Context,
    eh: PolyglotErrorHandler,
    options?: PersistArtifactOptions,
  ): void;
}

export interface PolyglotModuleDeclOptions {
  readonly isPolyglotModuleDecl?: true;
}

export interface PolyglotModuleDecl extends PolyglotModuleDeclOptions {
  readonly isPolyglotModuleDecl: true;
  readonly name: inflect.InflectableValue;
  declareInterface(intf: PolyglotInterfaceDecl): PolyglotInterfaceDecl;
  declareContent(content: PolyglotContentDecl): PolyglotContentDecl;
}

export const isPolyglotModuleDecl = safety.typeGuard<PolyglotModuleDecl>(
  "isPolyglotModuleDecl",
);

export interface PolyglotInterfaceDeclOptions {
  readonly isPolyglotInterfaceDecl?: true;
}

export interface PolyglotInterfaceDecl extends PolyglotInterfaceDeclOptions {
  readonly isPolyglotInterfaceDecl: true;
  readonly name: inflect.InflectableValue;
  declareProperty(prop: PolyglotPropertyDecl): PolyglotPropertyDecl;
}

export const isPolyglotInterfaceDecl = safety.typeGuard<PolyglotInterfaceDecl>(
  "isPolyglotInterfaceDecl",
);

export interface PolyglotPropertyDeclOptions {
  readonly isPolyglotPropertyDecl?: true;
}

export interface PolyglotPropertyDecl extends PolyglotPropertyDeclOptions {
  readonly isPolyglotPropertyDecl: true;
  getInterfaceDecl(
    ctx: cm.Context,
    eh: PolyglotErrorHandler,
  ): string | undefined;
}

export const isPolyglotPropertyDecl = safety.typeGuard<PolyglotPropertyDecl>(
  "isPolyglotPropertyDecl",
);

export interface PolyglotContentOptions {
  readonly mutable?: boolean;
}

export interface PolyglotContentDecl extends PolyglotContentOptions {
  readonly isPolyglotContentDecl: true;
  readonly name: inflect.InflectableValue;
  readonly content: unknown;
}

export const isPolyglotContentDecl = safety.typeGuard<PolyglotContentDecl>(
  "isPolyglotContentDecl",
);
