/**
 * Type declaration for global stylesheet imports.
 *
 * Next ships declarations for `*.module.css` — the CSS-modules form, which
 * returns an object of class names — but none for a plain global stylesheet
 * imported for its side effect alone:
 *
 *     import "./globals.css";
 *
 * TypeScript 5.6 added a diagnostic for exactly that case, "Cannot find module
 * or type declarations for side-effect import". It is off by default, so
 * `tsc --noEmit` and `next build` both pass — but an editor running a newer or
 * stricter TypeScript turns it on and puts a red squiggle under the line that
 * loads the entire site's styling. That is a bad place for a permanent false
 * alarm: a real error appearing next to it would be easy to dismiss.
 *
 * Declaring it here is not a workaround for a mistake in our code. The import
 * is correct and Next handles it at build time; the type declaration is simply
 * something Next does not provide, so we provide it.
 *
 * `*.module.css` keeps its own typing: TypeScript matches the most specific
 * wildcard, so the declaration below never shadows it and CSS-module class
 * names stay typed.
 */

declare module "*.css";
declare module "*.scss";
declare module "*.sass";
