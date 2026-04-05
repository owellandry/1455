import hljs from "highlight.js/lib/core";
// These are the 37 "common" languages from lowlight/common
// https://github.com/wooorm/lowlight/blob/f13526430ee01ae2c4b7085f3e6d0362153a8c36/lib/common.js#L49-L85
import arduino from "highlight.js/lib/languages/arduino";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import graphql from "highlight.js/lib/languages/graphql";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import latex from "highlight.js/lib/languages/latex";
import less from "highlight.js/lib/languages/less";
import lua from "highlight.js/lib/languages/lua";
import makefile from "highlight.js/lib/languages/makefile";
import markdown from "highlight.js/lib/languages/markdown";
import mathematica from "highlight.js/lib/languages/mathematica";
import matlab from "highlight.js/lib/languages/matlab";
import nginx from "highlight.js/lib/languages/nginx";
import objectivec from "highlight.js/lib/languages/objectivec";
import perl from "highlight.js/lib/languages/perl";
import pgsql from "highlight.js/lib/languages/pgsql";
import php from "highlight.js/lib/languages/php";
import phpTemplate from "highlight.js/lib/languages/php-template";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import pythonRepl from "highlight.js/lib/languages/python-repl";
import r from "highlight.js/lib/languages/r";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import vbnet from "highlight.js/lib/languages/vbnet";
import wasm from "highlight.js/lib/languages/wasm";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

// Copied from chatgpt/web
import { logger } from "@/utils/logger";

// We additionally support these extra languages

const languages = {
  // Common languages
  arduino,
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  go,
  graphql,
  ini,
  java,
  javascript,
  json,
  kotlin,
  less,
  lua,
  makefile,
  markdown,
  objectivec,
  perl,
  php,
  "php-template": phpTemplate,
  plaintext,
  python,
  "python-repl": pythonRepl,
  r,
  ruby,
  rust,
  scss,
  shell,
  sql,
  swift,
  typescript,
  vbnet,
  wasm,
  xml,
  yaml,

  // Extra languages
  latex,
  mathematica,
  matlab,
  nginx,
  pgsql,
};

for (const [name, language] of Object.entries(languages)) {
  hljs.registerLanguage(name, language);
}

hljs.registerAliases(["wolfram"], { languageName: "mathematica" });

export type HighlightCodeResponse = {
  html: string;
  language?: string;
};

export function highlightCode(
  code: string,
  language?: string,
): HighlightCodeResponse {
  logger.trace("[highlight-code] start", {
    safe: { language: language ?? "auto", codeLength: code.length },
    sensitive: {},
  });

  if (language) {
    const { value } = hljs.highlight(code, { language });
    return { html: value, language };
  }

  const { value, language: detectedLanguage } = hljs.highlightAuto(code);
  return { html: value, language: detectedLanguage };
}
