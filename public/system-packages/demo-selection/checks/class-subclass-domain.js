module.exports = ({ characterData, resourceLibraries }) => {
  const issues = [];
  const values = characterData.character.values;
  const classes = findLibrary(resourceLibraries, "classes");
  const subclasses = findLibrary(resourceLibraries, "subclasses");
  const domainCards = findLibrary(resourceLibraries, "domain-cards");

  const className = stringValue(values["class-name"]);
  const subclassName = stringValue(values["subclass-name"]);
  const singleDomainCardName = stringValue(values["domain-card-name"]);
  const domainCardNames = uniqueValues([...splitCardNames(values["domain-card-list"]), singleDomainCardName]);

  const classEntry = findEntryByName(classes, className);
  const subclassEntry = findEntryByName(subclasses, subclassName);

  if (classEntry && subclassEntry && subclassEntry.fields["主职"] !== className) {
    issues.push({
      level: "error",
      code: "SUBCLASS_CLASS_MISMATCH",
      path: "character.values.subclass-name",
      text: `子职「${subclassName}」属于「${subclassEntry.fields["主职"]}」，不属于当前主职业「${className}」。`,
    });
  }

  const allowedDomains = classEntry ? classDomains(classEntry) : [];
  for (const cardName of domainCardNames) {
    const cardEntry = findEntryByName(domainCards, cardName);
    if (!classEntry || !cardEntry) {
      continue;
    }

    const cardDomain = cardEntry.fields["领域"];
    if (!allowedDomains.includes(cardDomain)) {
      issues.push({
        level: "error",
        code: "DOMAIN_CARD_CLASS_MISMATCH",
        path: "character.values.domain-card-list",
        text: `领域卡「${cardName}」属于「${cardDomain}」，不在主职业「${className}」领域（${allowedDomains.join("、")}）内。`,
      });
    }
  }

  return issues;
};

function findLibrary(resourceLibraries, id) {
  return resourceLibraries.find((library) => library.ID === id);
}

function findEntryByName(library, name) {
  return library?.entries.find((entry) => entry.fields["名称"] === name);
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function splitCardNames(value) {
  return stringValue(value)
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitDomains(value) {
  return value
    .split(/[+、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function classDomains(classEntry) {
  return uniqueValues([classEntry.fields["领域1"], classEntry.fields["领域2"], ...splitDomains(classEntry.fields["领域"] ?? "")]);
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => stringValue(value)).filter(Boolean))];
}
