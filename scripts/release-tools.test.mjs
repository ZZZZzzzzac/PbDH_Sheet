import test from "node:test";
import assert from "node:assert/strict";
import { assertReleaseTag, assertVersion, verifyBuildHtml } from "./release-tools.mjs";

test("accepts the project three-part version format", () => {
  assert.doesNotThrow(() => assertVersion("2.4.13"));
  assert.throws(() => assertVersion("v2.4.13"), /必须是 X\.Y\.Z/);
  assert.throws(() => assertVersion("02.4.13"), /必须是 X\.Y\.Z/);
});

test("requires the release tag to match the application version", () => {
  assert.doesNotThrow(() => assertReleaseTag("v1.3.0", "1.3.0"));
  assert.throws(() => assertReleaseTag("v1.3.1", "1.3.0"), /不一致/);
});

test("accepts a versioned build rooted below pbdh", () => {
  const html = '<meta name="pbdh-version" content="1.3.0"><script src="/pbdh/assets/app-123.js"></script>';
  assert.doesNotThrow(() => verifyBuildHtml(html, "1.3.0"));
});

test("rejects a build containing domain-root assets", () => {
  const html = '<meta name="pbdh-version" content="1.3.0"><script src="/assets/app-123.js"></script>';
  assert.throws(() => verifyBuildHtml(html, "1.3.0"), /站点根路径资源/);
});

test("rejects a build with the wrong health-check version", () => {
  const html = '<meta name="pbdh-version" content="1.2.9"><script src="/pbdh/assets/app-123.js"></script>';
  assert.throws(() => verifyBuildHtml(html, "1.3.0"), /缺少版本标记/);
});
