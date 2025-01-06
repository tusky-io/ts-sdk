const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Files to process
const files = [
  "lib/node/types/core/me.js",
  "lib/node/types/core/api-key.js",
  "lib/node/types/core/file.js",
  "lib/node/types/core/folder.js",
  "lib/node/types/core/vault.js",
  "lib/node/types/core/zip.js",
  "lib/node/types/core/storage.js",
];

const capitalizeFirstChar = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const outputFile = "DOCS.md";

let docsContent = `# SDK Documentation\n\n## Modules\n`;

// Iterate through each file and add its content to the combined file
files.forEach((filePath) => {
  // Extract the file name without extension and capitalize the first character
  const fileName = path.basename(filePath, ".js");

  // Add a menu entry for this file
  docsContent += `- [${capitalizeFirstChar(fileName)}](#${fileName})\n`;
});

// Add a blank line after the menu
docsContent += `\n`;

files.forEach((filePath) => {
  const fileName = path.basename(filePath, ".js");
  const outputFile = `${fileName}.md`;

  // Generate documentation
  execSync(
    `npx documentation build ${filePath} --shallow -f md > ${outputFile}`,
  );

  // Replace "Table of Contents" with the file name
  let content = fs.readFileSync(outputFile, "utf-8");
  content = content.replace(
    /^### Table of Contents/m,
    `# ${capitalizeFirstChar(fileName)}`,
  );
  fs.writeFileSync(outputFile, content);

  docsContent += content + `\n\n`; // Add the content of the file

  console.log(`Generated and updated ${outputFile}`);
  fs.unlinkSync(outputFile);
  console.log(`Deleted temporary file: ${outputFile}`);
});

// Write the combined content to the output file
fs.writeFileSync(outputFile, docsContent);
console.log(`Docs file created: ${outputFile}`);
