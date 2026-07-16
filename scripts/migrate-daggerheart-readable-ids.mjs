import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "public", "system-packages", "daggerheart-core");
const resourcesRoot = path.join(packageRoot, "resources");

const configs = [
  { file: "classes.json", id: (entry) => `职业:${entry.名称}` },
  { file: "subclasses.json", id: (entry) => `子职:${entry.主职}:${entry.名称}:${entry.等级}`, art: (entry) => `assets/cards/subclasses/${entry.主职}/${entry.名称}-${entry.等级}.webp` },
  { file: "ancestries.json", id: (entry) => `种族:${entry.名称}`, art: (entry) => `assets/cards/ancestries/${entry.名称}.webp` },
  { file: "communities.json", id: (entry) => `社群:${entry.名称}`, art: (entry) => `assets/cards/communities/${entry.名称}.webp` },
  { file: "domain-cards.json", id: (entry) => `领域卡:${entry.领域}:${entry.名称}`, art: (entry) => `assets/cards/domain-cards/${entry.领域}/${entry.名称}.webp` },
  { file: "weapons.json", id: (entry) => `${entry.类型}:${entry.名称}` },
  { file: "armor.json", id: (entry) => `护甲:${entry.名称}` },
  { file: "loot.json", id: (entry) => `战利品:${entry.名称}` },
];

let entryCount = 0;
let imageCount = 0;
for (const config of configs) {
  const filePath = path.join(resourcesRoot, config.file);
  const entries = JSON.parse(await readFile(filePath, "utf8"));
  const ids = entries.map(config.id);
  assertUnique(ids, `${config.file} Resource ID`);

  for (const entry of entries) {
    const previousId = typeof entry.旧ID === "string" ? entry.旧ID : entry.ID;
    entry.ID = config.id(entry);
    entry.旧ID = previousId;
    entryCount += 1;

    if (!config.art || !entry.卡图) continue;
    const nextArt = config.art(entry);
    assertSafeRelativePath(nextArt);
    if (entry.卡图 !== nextArt) await moveAsset(entry.卡图, nextArt);
    entry.卡图 = nextArt;
    imageCount += 1;
  }

  await writeFile(filePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

const voidEntryCount = await migrateVoidExtension();
console.log(`Migrated ${entryCount} core Resource IDs, ${voidEntryCount} Void Resource IDs, and ${imageCount} card images.`);

async function migrateVoidExtension() {
  const extensionPath = path.join(repoRoot, "public", "resource-extensions", "the-void-20260710.json");
  const extension = JSON.parse(await readFile(extensionPath, "utf8"));
  const idRules = {
    classes: (entry) => `虚空:职业:${entry.名称}`,
    subclasses: (entry) => `虚空:子职:${entry.主职}:${entry.名称}`,
    ancestries: (entry) => `虚空:种族:${entry.名称}`,
    communities: (entry) => `虚空:社群:${entry.名称}`,
    "domain-cards": (entry) => `虚空:领域卡:${entry.领域}:${entry.名称}`,
    "void-transformations": (entry) => `虚空:转变:${entry.名称}`,
  };
  let count = 0;
  for (const contribution of extension.resourceLibraries) {
    const makeId = idRules[contribution.ID];
    if (!makeId) throw new Error(`Missing Void ID rule for ${contribution.ID}`);
    assertUnique(contribution.entries.map(makeId), `Void ${contribution.ID} Resource ID`);
    for (const entry of contribution.entries) {
      const previousId = typeof entry.旧ID === "string" ? entry.旧ID : entry.ID;
      entry.ID = makeId(entry);
      entry.旧ID = previousId;
      count += 1;
    }
  }
  await writeFile(extensionPath, `${JSON.stringify(extension, null, 2)}\n`, "utf8");
  return count;
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${label} is not unique: ${value}`);
    seen.add(value);
  }
}

function assertSafeRelativePath(value) {
  if (!value.startsWith("assets/") || value.includes("..") || /[<>:"|?*]/u.test(value.replaceAll("/", ""))) {
    throw new Error(`Unsafe asset path: ${value}`);
  }
}

async function moveAsset(previousRelativePath, nextRelativePath) {
  const previousPath = path.join(packageRoot, ...previousRelativePath.split("/"));
  const nextPath = path.join(packageRoot, ...nextRelativePath.split("/"));
  if (await exists(nextPath)) return;
  if (!await exists(previousPath)) throw new Error(`Missing source asset: ${previousRelativePath}`);
  await mkdir(path.dirname(nextPath), { recursive: true });
  await rename(previousPath, nextPath);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
