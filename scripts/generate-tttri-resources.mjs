import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, "docs", "pbdh", "粥");
const packageRoot = path.join(repoRoot, "public", "system-packages", "tttri");
const resourcesRoot = path.join(packageRoot, "resources");
const assetsRoot = path.join(packageRoot, "assets", "cards", "domain-cards");
const checkOnly = process.argv.includes("--check");

const expectedResourceCounts = {
  "classes.json": 7,
  "subclasses.json": 140,
  "ancestries.json": 35,
  "communities.json": 15,
  "domain-cards.json": 231,
  "armor.json": 34,
  "loot.json": 120,
};

const deprecatedDomainCards = new Set(["反制技巧", "关键情报"]);
const artworkSourceName = new Map([
  ["掎角之锋", "犄角之锋"],
  ["治愈苦痛", "治愈痛苦"],
]);
const supplementalBacks = new Map([
  ["大地的慈悲", "大地的慈悲-昭示"],
  ["霜白摇篮曲", "摇篮曲-终"],
  ["归乡邀约", "归乡邀约-洗礼"],
]);
const expectedDomains = ["奥术", "工业", "攻坚", "坚阵", "精准", "秘行", "奇迹", "心界", "迅攻", "远见", "支柱"];
const expectedDomainLevelCounts = new Map([
  ["1级", 3],
  ["2级", 2],
  ["3级", 2],
  ["4级", 2],
  ["5级", 2],
  ["6级", 2],
  ["7级", 2],
  ["8级", 2],
  ["9级", 2],
  ["10级", 2],
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function assertRequiredTextFields(entries, fields, label) {
  for (const entry of entries) {
    for (const field of fields) {
      invariant(typeof entry[field] === "string" && entry[field].trim(), `${label}/${entry.ID} 缺少 ${field}`);
    }
  }
}

function assertUniqueMatrix(entries, groupFields, variantField, expectedVariants, label) {
  const groups = new Map();
  for (const entry of entries) {
    const key = groupFields.map((field) => entry[field]).join("/");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry[variantField]);
  }
  for (const [key, variants] of groups) {
    invariant(
      variants.length === expectedVariants.length
        && new Set(variants).size === variants.length
        && expectedVariants.every((variant) => variants.includes(variant)),
      `${label}/${key} 矩阵错误：${variants.join(", ")}`,
    );
  }
}

function normalizeNewlines(value) {
  return value.replace(/\r\n?/g, "\n");
}

function compactBlankLines(value) {
  return normalizeNewlines(value).replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

function stripDocumentNoise(value) {
  return compactBlankLines(
    normalizeNewlines(value)
      .replace(/^!\[Image\]\([^\n]+\)\s*$/gm, "")
      .replace(/^https?:\/\/\S+\s*$/gm, "")
      .replace(/^（可能需要和[^\n]+）\s*$/gm, ""),
  );
}

function normalizeIdentity(value) {
  return value
    .replace(/\\([.+()\-])/g, "$1")
    .replace(/^[“”"']+|[“”"']+$/g, "")
    .trim();
}

function plainValue(value) {
  return value.replace(/\\([+\-])/g, "$1").trim();
}

function decodeXmlText(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseDocxParagraphs(buffer, filePath) {
  const documentXml = unzipSync(buffer)["word/document.xml"];
  invariant(documentXml, `DOCX 缺少 word/document.xml：${filePath}`);
  const xml = strFromU8(documentXml);
  return [...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map((paragraphMatch) => {
    const runs = [...paragraphMatch[1].matchAll(/<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g)]
      .map((runMatch) => {
        const text = [...runMatch[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
          .map((textMatch) => decodeXmlText(textMatch[1]))
          .join("");
        const color = /<w:color\b[^>]*\bw:val="([^"]+)"/i.exec(runMatch[1])?.[1].toLowerCase() ?? "";
        return { text, color };
      })
      .filter((run) => run.text);
    return { text: runs.map((run) => run.text).join("").trim(), runs };
  });
}

const docxColorDirectives = new Map([
  ["d83931", "red"],
  ["dc9b04", "yellow"],
  ["de7802", "orange"],
  ["2ea121", "green"],
]);

function formattedDocxParagraph(paragraph) {
  const segments = [];
  let currentColor = "";
  let current = "";
  const flush = () => {
    if (!current) return;
    const directive = docxColorDirectives.get(currentColor);
    segments.push(directive ? `:${directive}[**${current}**]` : current);
    current = "";
  };
  for (const run of paragraph.runs) {
    const nextColor = docxColorDirectives.has(run.color) ? run.color : "";
    if (nextColor !== currentColor) flush();
    currentColor = nextColor;
    current += run.text;
  }
  flush();
  return segments.join("").trim();
}

function nextTextParagraph(paragraphs, startIndex) {
  return paragraphs.slice(startIndex + 1).find((paragraph) => paragraph.text);
}

async function parseSubclassUpgradeAnnotations(filePath) {
  const paragraphs = parseDocxParagraphs(await readFile(filePath), filePath);
  const annotations = new Map();
  let subclassName = "";
  let stageName = "";

  for (let index = 0; index < paragraphs.length; index += 1) {
    const text = paragraphs[index].text;
    const subclassMatch = /^〖(.+)〗$/.exec(text);
    if (subclassMatch) {
      subclassName = subclassMatch[1].trim();
      annotations.set(subclassName, { T1: [], T2: [], T3: [], T4X: [], T4Y: [] });
      continue;
    }
    if (["预备干员", "正式干员", "资深干员", "精英干员"].includes(text)) {
      stageName = text;
      continue;
    }
    if (!subclassName) continue;

    const next = nextTextParagraph(paragraphs, index);
    const target = annotations.get(subclassName);
    if (stageName === "预备干员" && text === "【子职特性】") {
      target.T1.push(`子职特性获得：${formattedDocxParagraph(next)}`);
    } else if (stageName === "正式干员" && /^子职特性(?:二次)?(?:提升|追加)$/.test(text)) {
      target.T2.push(`子职特性${text.endsWith("追加") ? "追加" : "增强"}：${formattedDocxParagraph(next)}`);
    } else if (stageName === "资深干员" && text === "职业特性提升") {
      target.T3.push(`职业特性增强：${formattedDocxParagraph(next)}`);
    } else if (stageName === "资深干员" && /^子职特性(?:二次)?(?:提升|追加)$/.test(text)) {
      target.T3.push(`子职特性${text.endsWith("追加") ? "追加" : "增强"}：${formattedDocxParagraph(next)}`);
    } else if (stageName === "精英干员" && text === "希望特性提升") {
      target.T4X.push(`希望特性增强：${formattedDocxParagraph(next)}`);
    } else if (stageName === "精英干员" && text === "追加第二职业特性") {
      target.T4Y.push(`职业特性追加：${formattedDocxParagraph(next)}`);
    }
  }

  invariant(annotations.size === 4, `${filePath} 子职标注数量不是 4`);
  for (const [name, stages] of annotations) {
    invariant(
      stages.T1.length === 1 && stages.T2.length === 1 && stages.T3.length === 2
        && stages.T4X.length === 1 && stages.T4Y.length === 1,
      `${filePath}/${name} 子职提升标注不完整`,
    );
  }
  return new Map([...annotations].map(([name, stages]) => [name, {
    T1: stages.T1.join("\n\n"),
    T2: stages.T2.join("\n"),
    T3: stages.T3.join("\n\n"),
    T4X: stages.T4X.join("\n"),
    T4Y: stages.T4Y.join("\n"),
  }]));
}

function contentAfterHeading(block, headingPattern, endPattern) {
  const heading = headingPattern.exec(block);
  invariant(heading, `找不到标题：${headingPattern}`);
  const start = heading.index + heading[0].length;
  const remaining = block.slice(start);
  if (!endPattern) return stripDocumentNoise(remaining);
  const end = endPattern.exec(remaining);
  invariant(end, `找不到结束标题：${endPattern}`);
  return stripDocumentNoise(remaining.slice(0, end.index));
}

async function readText(filePath) {
  return normalizeNewlines(await readFile(filePath, "utf8"));
}

async function markdownFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right, "zh-Hans"));
}

function splitHeadingSections(text, pattern) {
  const matches = [...text.matchAll(pattern)];
  return matches.map((match, index) => ({
    name: match[1].trim(),
    body: text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length),
  }));
}

function cleanRecommendedDomains(raw) {
  return raw
    .replace(/\*\*/g, "")
    .replace(/[【】]/g, "")
    .split("、")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("、");
}

function parseWeaponPrototype(raw) {
  const parts = raw.split("/").map((item) => item.trim());
  invariant(parts.length === 3, `无法解析武器原型：${raw}`);
  const first = /^(.*)\s+(近距离|中距离|远距离)$/.exec(parts[0]);
  invariant(first, `无法解析武器名称和距离：${raw}`);
  return {
    武器原型: raw,
    武器名称: first[1].trim(),
    距离: first[2],
    负荷: parts[1],
    伤害类型: parts[2],
  };
}

function parseSubclassRow(rawRow) {
  const row = rawRow.slice(1, -1).replace(/<br\s*\/?>/gi, "\n").trim();
  const stageMatch = /^## (预备干员|正式干员|资深干员|精英干员)$/m.exec(row);
  invariant(stageMatch, `无法解析子职阶段：${row.slice(0, 80)}`);
  const prototypeMatch = /^武器原型[：:]\s*(.+)$/m.exec(row);
  invariant(prototypeMatch, `缺少武器原型：${row.slice(0, 80)}`);
  const weapon = parseWeaponPrototype(prototypeMatch[1].trim());
  const damageMatch = /^武器伤害骰[：:]\s*(.+)$/m.exec(row);

  if (stageMatch[1] === "精英干员") {
    const xBlock = contentAfterHeading(
      row,
      /^### \*\*【X模组】\*\*$/m,
      /^### \*\*【Y模组】\*\*$/m,
    );
    const yBlock = contentAfterHeading(row, /^### \*\*【Y模组】\*\*$/m);
    return {
      stage: "T4",
      stageName: stageMatch[1],
      weapon,
      damage: "+3",
      xFeature: contentAfterHeading(xBlock, /^#### 希望特性提升$/m).replace(/^---$/gm, "").trim(),
      yFeature: contentAfterHeading(yBlock, /^#### 追加第二职业特性$/m).trim(),
    };
  }

  invariant(damageMatch, `缺少武器伤害骰：${row.slice(0, 80)}`);
  const stage = { 预备干员: "T1", 正式干员: "T2", 资深干员: "T3" }[stageMatch[1]];
  const classHeading = /^### \*\*职业特性提升\s*\*\*$/m;
  const subclassHeading = /^### \*\*【?子职特性[^\n]*?】?\*\*$/m;
  const classFeature = stage === "T3" ? contentAfterHeading(row, classHeading, subclassHeading) : "";
  const subclassFeature = contentAfterHeading(row, subclassHeading);
  return {
    stage,
    stageName: stageMatch[1],
    weapon,
    damage: plainValue(damageMatch[1]),
    classFeature,
    subclassFeature,
  };
}

function applyDamageAdjustment(base, adjustment) {
  const baseMatch = /^(d\d+)([+-]\d+)?$/.exec(base);
  const adjustmentMatch = /^([+-]\d+)$/.exec(adjustment);
  invariant(baseMatch && adjustmentMatch, `无法合并武器伤害骰：${base} ${adjustment}`);
  const modifier = Number(baseMatch[2] ?? 0) + Number(adjustmentMatch[1]);
  return `${baseMatch[1]}${modifier === 0 ? "" : modifier > 0 ? `+${modifier}` : modifier}`;
}

async function buildClassResources() {
  const classes = [];
  const subclasses = [];
  const files = await markdownFiles(path.join(sourceRoot, "职业"));

  for (const filePath of files) {
    const text = await readText(filePath);
    const upgradeAnnotations = await parseSubclassUpgradeAnnotations(filePath.replace(/\.md$/i, ".docx"));
    const className = /^# (?!〖)([^\n]+)$/m.exec(text)?.[1].trim();
    invariant(className, `找不到职业名称：${filePath}`);
    const hp = /初始生命点】<br>(\d+)/.exec(text)?.[1];
    const evasion = /初始闪避值】<br>(\d+)/.exec(text)?.[1];
    const primaryDomain = /初始主选领域】<br>([^|\n]+)/.exec(text)?.[1].trim();
    invariant(hp && evasion && primaryDomain, `职业基础数值不完整：${className}`);
    const hopeFeature = contentAfterHeading(
      text,
      /^### \*\*【希望特性】\*\*$/m,
      /^### \*\*【职业特性】\*\*$/m,
    );
    const classFeature = contentAfterHeading(
      text,
      /^### \*\*【职业特性】\*\*$/m,
      /^---$/m,
    );

    classes.push({
      ID: `职业:${className}`,
      名称: className,
      生命点: hp,
      闪避值: evasion,
      希望特性: hopeFeature,
      职业特性: classFeature,
      主领域: primaryDomain,
      类型: "职业",
      描述: "[待补充：职业简介]",
      背景问题1: "[待补充：背景问题1]",
      背景问题2: "[待补充：背景问题2]",
      背景问题3: "[待补充：背景问题3]",
      关系问题1: "[待补充：关系问题1]",
      关系问题2: "[待补充：关系问题2]",
      关系问题3: "[待补充：关系问题3]",
    });

    const sections = splitHeadingSections(text, /^# 〖([^〗]+)〗\s*$/gm);
    invariant(sections.length === 4, `${className} 子职数量不是 4`);
    for (const section of sections) {
      const sectionUpgrades = upgradeAnnotations.get(section.name);
      invariant(sectionUpgrades, `${className}/${section.name} 缺少 DOCX 子职提升标注`);
      const recommended = /推荐搭配领域[：:]\s*(.+)$/m.exec(section.body)?.[1];
      invariant(recommended, `缺少推荐领域：${className}/${section.name}`);
      const rows = section.body.match(/^\|##[^\n]+\|\s*$/gm) ?? [];
      invariant(rows.length === 4, `${className}/${section.name} 阶段数量不是 4`);
      const parsedRows = rows.map(parseSubclassRow);
      const t3 = parsedRows.find((row) => row.stage === "T3");
      const t4 = parsedRows.find((row) => row.stage === "T4");
      invariant(t3?.classFeature && t4?.xFeature && t4?.yFeature, `子职升级文本不完整：${className}/${section.name}`);

      for (const row of parsedRows.filter((candidate) => candidate.stage !== "T4")) {
        const entry = {
          ID: `子职:${className}:${section.name}:${row.stage}`,
          主职: className,
          名称: section.name,
          类型: "子职",
          阶段: row.stage,
          阶段名称: row.stageName,
          推荐领域: cleanRecommendedDomains(recommended),
          ...row.weapon,
          武器伤害骰: row.damage,
          子职提升: sectionUpgrades[row.stage],
          子职特性: row.subclassFeature,
          职业特性: row.classFeature,
          希望特性: "",
        };
        subclasses.push(entry);
      }

      const eliteDamage = applyDamageAdjustment(t3.damage, t4.damage);
      subclasses.push(
        {
          ID: `子职:${className}:${section.name}:T4X`,
          主职: className,
          名称: section.name,
          类型: "子职",
          阶段: "T4X",
          阶段名称: "精英干员 X",
          推荐领域: cleanRecommendedDomains(recommended),
          ...t4.weapon,
          武器伤害骰: eliteDamage,
          子职提升: sectionUpgrades.T4X,
          子职特性: "",
          职业特性: "",
          希望特性: t4.xFeature,
        },
        {
          ID: `子职:${className}:${section.name}:T4Y`,
          主职: className,
          名称: section.name,
          类型: "子职",
          阶段: "T4Y",
          阶段名称: "精英干员 Y",
          推荐领域: cleanRecommendedDomains(recommended),
          ...t4.weapon,
          武器伤害骰: eliteDamage,
          子职提升: sectionUpgrades.T4Y,
          子职特性: "",
          职业特性: `${t3.classFeature}\n\n${t4.yFeature}`,
          希望特性: "",
        },
      );
    }
  }

  return { classes, subclasses };
}

function parseAncestryTitle(raw) {
  return raw
    .replace(/\*\*/g, "")
    .replace(/\\&/g, "&")
    .trim()
    .split(/\s+&\s+/)
    .map((part) => {
      const match = /^(.*?)\s+([^\s]+)$/.exec(part.trim());
      invariant(match, `无法解析种族标题：${raw}`);
      return { name: match[1].trim(), originalName: match[2].trim() };
    });
}

function parseRecommendations(line, ancestryNames) {
  const cleaned = line
    .replace(/\*\*/g, "")
    .replace(/^.*?推荐经历\s*[：:]\s*/, "")
    .trim();
  const byName = Object.fromEntries(ancestryNames.map((name) => [name, []]));
  for (const rawItem of cleaned.split("，").map((item) => item.trim()).filter(Boolean)) {
    const specific = /^(.*)（([^）]+)）$/.exec(rawItem);
    const value = plainValue(specific?.[1] ?? rawItem);
    if (specific) {
      invariant(byName[specific[2]], `未知种族专属经历：${specific[2]}`);
      byName[specific[2]].push(value);
    } else {
      for (const name of ancestryNames) byName[name].push(value);
    }
  }
  return byName;
}

function splitExperience(value) {
  const match = /^(.*?)([+-]\d+)$/.exec(value.trim());
  invariant(match, `无法拆分经历名称与修正值：${value}`);
  return { name: match[1].trim(), modifier: match[2] };
}

async function buildAncestries() {
  const text = await readText(path.join(sourceRoot, "种族", "明日方舟种族.md"));
  const sections = splitHeadingSections(text, /^# (?!明日方舟种族$)([^\n]+)$/gm);
  const entries = [];

  for (const section of sections) {
    const identities = parseAncestryTitle(section.name);
    const cleanedBody = normalizeNewlines(section.body).replace(/^!\[Image\]\([^\n]+\)\s*$/gm, "");
    const lines = cleanedBody.split("\n");
    const recommendationIndex = lines.findIndex((line) => line.includes("推荐经历"));
    invariant(recommendationIndex >= 0, `缺少种族推荐经历：${section.name}`);
    const recommendations = parseRecommendations(lines[recommendationIndex], identities.map((item) => item.name));
    const before = lines.slice(0, recommendationIndex).join("\n");
    const after = lines.slice(recommendationIndex + 1).join("\n");
    const descriptionParts = before.split(/^---\s*$/m).map(stripDocumentNoise);
    if (stripDocumentNoise(after)) descriptionParts[0] = stripDocumentNoise(`${descriptionParts[0]}\n\n${after}`);
    invariant(descriptionParts.length === identities.length, `种族描述分段数量不匹配：${section.name}`);

    identities.forEach((identity, index) => {
      const list = recommendations[identity.name];
      invariant(list.length >= 2, `${identity.name} 推荐经历少于 2 项`);
      const defaultExperience = splitExperience(list[0]);
      entries.push({
        ID: `种族:${identity.name}`,
        名称: identity.name,
        原名: identity.originalName,
        类型: "种族",
        简介: descriptionParts[index],
        推荐经历: list.join("、"),
        默认种族经历: defaultExperience.name,
        默认种族经历修正: defaultExperience.modifier,
        显示方式: "text",
      });
    });
  }
  return entries;
}

async function buildCommunities() {
  const text = await readText(path.join(sourceRoot, "明日方舟社群（众生行记）.md"));
  const sections = splitHeadingSections(text, /^# \*\*([^\n*]+)\*\*\s*$/gm);
  return sections.map((section) => {
    const body = stripDocumentNoise(section.body);
    const referenceMarker = "**参考出身**";
    const referenceIndex = body.indexOf(referenceMarker);
    invariant(referenceIndex >= 0, `缺少参考出身：${section.name}`);
    const before = body.slice(0, referenceIndex).trim();
    const referenceOrigins = body.slice(referenceIndex + referenceMarker.length).trim();
    const beforeLines = before.split("\n");
    const firstLineIndex = beforeLines.findIndex((line) => line.trim());
    const firstLine = beforeLines[firstLineIndex];
    invariant(firstLine, `缺少社群简介：${section.name}`);
    const description = stripDocumentNoise(beforeLines.slice(firstLineIndex + 1).join("\n"));
    invariant(description, `缺少社群能力：${section.name}`);
    return {
      ID: `社群:${section.name}`,
      名称: section.name,
      类型: "社群",
      简介: firstLine.replace(/^\*|\*$/g, ""),
      描述: description,
      参考出身: referenceOrigins,
      显示方式: "text",
    };
  });
}

async function buildDomainCards() {
  const domainRoot = path.join(sourceRoot, "领域卡");
  const domains = (await readdir(domainRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "zh-Hans"));
  const cards = [];
  const assetCopies = [];
  const assignedSourceAssets = new Set();
  const allSourceWebp = new Set();

  for (const domain of domains) {
    const directory = path.join(domainRoot, domain);
    const files = await readdir(directory, { withFileTypes: true });
    const markdown = files.find((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"));
    invariant(markdown, `领域缺少 Markdown：${domain}`);
    const webpByStem = new Map();
    for (const file of files.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".webp"))) {
      const stem = path.parse(file.name).name;
      const sourcePath = path.join(directory, file.name);
      webpByStem.set(stem, sourcePath);
      allSourceWebp.add(sourcePath);
    }

    const text = await readText(path.join(directory, markdown.name));
    const header = /^等级(\d+)\s+回想(?:费用|等级)(\d+)\s*\n\s*\n([^\n]+)\s*\n\s*\n【[“”]?([^】“”]+)[“”]?】[^\n]*$/gm;
    const matches = [...text.matchAll(header)];
    const authoritative = new Map();
    matches.forEach((match, index) => {
      const name = normalizeIdentity(match[4]);
      const description = stripDocumentNoise(text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length));
      authoritative.set(name, {
        level: match[1],
        recall: match[2],
        attribute: match[3].trim(),
        name,
        description,
      });
    });
    for (const deprecated of deprecatedDomainCards) authoritative.delete(deprecated);
    invariant(authoritative.size === 21, `${domain} 最终领域卡数量不是 21，而是 ${authoritative.size}`);

    for (const card of authoritative.values()) {
      const sourceStem = artworkSourceName.get(card.name) ?? card.name;
      const frontSource = webpByStem.get(sourceStem);
      const entry = {
        ID: `领域卡:${domain}:${card.name}`,
        名称: card.name,
        类型: "领域卡",
        领域: domain,
        等级: `${card.level}级`,
        属性: card.attribute,
        回想: `${card.recall}⚡`,
        描述: card.description,
        显示方式: frontSource ? "image" : "text",
      };
      if (frontSource) {
        const relativeTarget = path.posix.join("assets", "cards", "domain-cards", domain, `${card.name}.webp`);
        entry.卡图 = relativeTarget;
        assetCopies.push({ source: frontSource, target: path.join(packageRoot, ...relativeTarget.split("/")) });
        assignedSourceAssets.add(frontSource);
      }
      const backStem = supplementalBacks.get(card.name);
      if (backStem) {
        const backSource = webpByStem.get(backStem);
        invariant(backSource, `找不到补充卡背：${domain}/${backStem}`);
        const relativeBack = path.posix.join("assets", "cards", "domain-cards", domain, `${backStem}.webp`);
        entry.卡背 = relativeBack;
        assetCopies.push({ source: backSource, target: path.join(packageRoot, ...relativeBack.split("/")) });
        assignedSourceAssets.add(backSource);
      }
      cards.push(entry);
    }
  }

  invariant(cards.length === 231, `领域卡总数不是 231，而是 ${cards.length}`);
  invariant(cards.filter((entry) => entry.显示方式 === "image").length === 189, "图片领域卡数量不是 189");
  invariant(cards.filter((entry) => entry.显示方式 === "text").length === 42, "文字领域卡数量不是 42");
  invariant(assetCopies.length === 192, `WebP 映射数量不是 192，而是 ${assetCopies.length}`);
  invariant(assignedSourceAssets.size === allSourceWebp.size, `仍有未分配 WebP：${[...allSourceWebp].filter((item) => !assignedSourceAssets.has(item)).join(", ")}`);
  return { cards, assetCopies };
}

async function buildCatalogs() {
  const { classes, subclasses } = await buildClassResources();
  const ancestries = await buildAncestries();
  const communities = await buildCommunities();
  const { cards: domainCards, assetCopies } = await buildDomainCards();
  const armor = JSON.parse(await readText(path.join(repoRoot, "public", "system-packages", "daggerheart-core", "resources", "armor.json")));
  const loot = JSON.parse(await readText(path.join(repoRoot, "public", "system-packages", "daggerheart-core", "resources", "loot.json")));
  return {
    resources: {
      "classes.json": classes,
      "subclasses.json": subclasses,
      "ancestries.json": ancestries,
      "communities.json": communities,
      "domain-cards.json": domainCards,
      "armor.json": armor,
      "loot.json": loot,
    },
    assetCopies,
  };
}

function validateCatalogs(catalogs) {
  for (const [fileName, expectedCount] of Object.entries(expectedResourceCounts)) {
    const entries = catalogs.resources[fileName];
    invariant(Array.isArray(entries), `${fileName} 不是数组`);
    invariant(entries.length === expectedCount, `${fileName} 条目数 ${entries.length} != ${expectedCount}`);
    const ids = entries.map((entry) => entry.ID);
    invariant(ids.every((id) => typeof id === "string" && id.trim()), `${fileName} 存在空 ID`);
    invariant(new Set(ids).size === ids.length, `${fileName} 存在重复 ID`);
  }
  const classes = catalogs.resources["classes.json"];
  const subclasses = catalogs.resources["subclasses.json"];
  const ancestries = catalogs.resources["ancestries.json"];
  const communities = catalogs.resources["communities.json"];
  const domainCards = catalogs.resources["domain-cards.json"];

  assertRequiredTextFields(classes, ["名称", "类型", "描述", "生命点", "闪避值", "主领域", "希望特性", "职业特性"], "职业");
  assertRequiredTextFields(subclasses, ["主职", "名称", "类型", "阶段", "阶段名称", "推荐领域", "武器原型", "武器名称", "距离", "负荷", "伤害类型", "武器伤害骰", "子职提升"], "子职");
  assertRequiredTextFields(ancestries, ["名称", "原名", "类型", "简介", "推荐经历", "默认种族经历", "默认种族经历修正", "显示方式"], "种族");
  assertRequiredTextFields(communities, ["名称", "类型", "简介", "描述", "参考出身", "显示方式"], "社群");
  assertRequiredTextFields(domainCards, ["名称", "类型", "领域", "等级", "属性", "回想", "描述", "显示方式"], "领域卡");

  assertUniqueMatrix(subclasses, ["主职", "名称"], "阶段", ["T1", "T2", "T3", "T4X", "T4Y"], "子职");
  invariant(new Set(subclasses.map((entry) => `${entry.主职}/${entry.名称}`)).size === 28, "子职组合数量不是 28");
  invariant(subclasses.every((entry) => ["子职特性", "职业特性", "希望特性"].every((field) => typeof entry[field] === "string")), "子职更新字段不是字符串");
  invariant(subclasses.filter((entry) => ["T1", "T2", "T3"].includes(entry.阶段)).every((entry) => entry.子职特性.trim()), "T1-T3 子职缺少子职特性");
  invariant(subclasses.filter((entry) => entry.阶段 === "T3").every((entry) => entry.职业特性.trim()), "T3 子职缺少职业特性");
  invariant(subclasses.filter((entry) => entry.阶段 === "T4X").every((entry) => entry.希望特性.trim() && !entry.职业特性 && !entry.子职特性), "精英 X 更新字段错误");
  invariant(subclasses.filter((entry) => entry.阶段 === "T4Y").every((entry) => entry.职业特性.trim() && !entry.希望特性 && !entry.子职特性), "精英 Y 更新字段错误");
  invariant(ancestries.every((entry) => entry.推荐经历.split("、")[0] === `${entry.默认种族经历}${entry.默认种族经历修正}`), "种族默认经历不是推荐经历第一项");
  invariant(ancestries.every((entry) => entry.默认种族经历修正 === "+2"), "种族默认经历修正值不是 +2");
  invariant(ancestries.every((entry) => entry.显示方式 === "text") && communities.every((entry) => entry.显示方式 === "text"), "种族或社群不是文字资源");

  const actualDomains = [...new Set(domainCards.map((entry) => entry.领域))].sort((left, right) => left.localeCompare(right, "zh-Hans"));
  invariant(JSON.stringify(actualDomains) === JSON.stringify(expectedDomains), `领域集合错误：${actualDomains.join(", ")}`);
  for (const domain of expectedDomains) {
    const cards = domainCards.filter((entry) => entry.领域 === domain);
    for (const [level, expectedCount] of expectedDomainLevelCounts) {
      invariant(cards.filter((entry) => entry.等级 === level).length === expectedCount, `${domain}/${level} 卡牌数量错误`);
    }
  }
  invariant(!domainCards.some((entry) => deprecatedDomainCards.has(entry.名称)), "废除领域卡仍存在");
  invariant(!domainCards.some((entry) => entry.卡图?.toLowerCase().endsWith(".png") || entry.卡背?.toLowerCase().endsWith(".png")), "领域卡资源引用了 PNG");
  invariant(domainCards.filter((entry) => entry.显示方式 === "image").every((entry) => entry.卡图), "图片领域卡缺少卡图");
  invariant(domainCards.filter((entry) => entry.显示方式 === "text").every((entry) => !entry.卡图), "文字领域卡错误引用卡图");
  invariant(domainCards.filter((entry) => entry.卡背).length === supplementalBacks.size, "补充卡背数量错误");
}

async function writeCatalogs(catalogs) {
  await mkdir(resourcesRoot, { recursive: true });
  for (const [fileName, entries] of Object.entries(catalogs.resources)) {
    await writeFile(path.join(resourcesRoot, fileName), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  }
  for (const asset of catalogs.assetCopies) {
    await mkdir(path.dirname(asset.target), { recursive: true });
    await copyFile(asset.source, asset.target);
  }
}

async function walkFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const itemPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walkFiles(itemPath));
    else result.push(itemPath);
  }
  return result;
}

async function validateWrittenFiles(catalogs) {
  for (const [fileName, expectedEntries] of Object.entries(catalogs.resources)) {
    const actual = JSON.parse(await readText(path.join(resourcesRoot, fileName)));
    invariant(JSON.stringify(actual) === JSON.stringify(expectedEntries), `${fileName} 与生成结果不一致`);
  }
  const expectedTargets = new Set(catalogs.assetCopies.map((item) => path.resolve(item.target)));
  const writtenAssets = (await walkFiles(assetsRoot)).map((item) => path.resolve(item));
  const referencedAssets = catalogs.resources["domain-cards.json"].flatMap((entry) => [entry.卡图, entry.卡背].filter(Boolean));
  invariant(new Set(referencedAssets).size === referencedAssets.length, "领域卡存在重复资产引用");
  invariant(referencedAssets.length === expectedTargets.size, `领域卡资产引用数量 ${referencedAssets.length} != ${expectedTargets.size}`);
  invariant(referencedAssets.every((item) => expectedTargets.has(path.resolve(packageRoot, ...item.split("/")))), "领域卡引用了未映射资产");
  invariant(writtenAssets.every((item) => path.extname(item).toLowerCase() === ".webp"), "运行时资产包含非 WebP 文件");
  invariant(writtenAssets.length === expectedTargets.size, `运行时 WebP 数量 ${writtenAssets.length} != ${expectedTargets.size}`);
  invariant(writtenAssets.every((item) => expectedTargets.has(item)), "运行时资产包含未分配文件");
  for (const asset of catalogs.assetCopies) {
    invariant((await stat(asset.target)).size === (await stat(asset.source)).size, `WebP 复制大小不一致：${asset.target}`);
  }
}

const catalogs = await buildCatalogs();
validateCatalogs(catalogs);
if (!checkOnly) await writeCatalogs(catalogs);
await validateWrittenFiles(catalogs);

const summary = {
  mode: checkOnly ? "check" : "generate",
  resources: Object.fromEntries(Object.entries(catalogs.resources).map(([name, entries]) => [name, entries.length])),
  webpAssets: catalogs.assetCopies.length,
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
