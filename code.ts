import { contextMgr as cm, inflect } from "./deps.ts";
import { PersistArtifactOptions } from "./io.ts";

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
}

export interface PolyglotModuleDecl extends PolyglotModuleDeclOptions {
  readonly isPolyglotModuleDecl: true;
  readonly name: inflect.InflectableValue;
  declareInterface(intf: PolyglotInterfaceDecl): PolyglotInterfaceDecl;
  declareContent(content: PolyglotContentDecl): PolyglotContentDecl;
}

export function isPolyglotModuleDecl(o: any): o is PolyglotModuleDecl {
  return typeof o === "object" && "isPolyglotModuleDecl" in o;
}

export interface PolyglotInterfaceDeclOptions {
}

export interface PolyglotInterfaceDecl extends PolyglotInterfaceDeclOptions {
  readonly isPolyglotInterfaceDecl: true;
  readonly name: inflect.InflectableValue;
  declareProperty(prop: PolyglotPropertyDecl): PolyglotPropertyDecl;
}

export function isPolyglotInterfaceDecl(o: any): o is PolyglotInterfaceDecl {
  return typeof o === "object" && "isPolyglotInterfaceDecl" in o;
}

export interface PolyglotPropertyDeclOptions {
}

export interface PolyglotPropertyDecl extends PolyglotPropertyDeclOptions {
  readonly isPolyglotPropertyDecl: true;
  getInterfaceDecl(
    ctx: cm.Context,
    eh: PolyglotErrorHandler,
  ): string | undefined;
}

export function isPolyglotPropertyDecl(o: any): o is PolyglotPropertyDecl {
  return typeof o === "object" && "isPolyglotPropertyDecl" in o;
}

export interface PolyglotContentOptions {
  readonly mutable?: boolean;
}

export interface PolyglotContentDecl extends PolyglotContentOptions {
  readonly isPolyglotContentDecl: true;
  readonly name: inflect.InflectableValue;
  readonly content: any;
}

export function isPolyglotContentDecl(o: any): o is PolyglotContentDecl {
  return typeof o === "object" && "isPolyglotContentDecl" in o;
}
