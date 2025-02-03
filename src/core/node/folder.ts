import { lstatSync, readdirSync } from "fs";
import { join, relative, basename, dirname } from "path";
import { FileOrFolderInfo } from "../folder";
import { BadRequest } from "../../errors/bad-request";

export const traverse = (
  folderPath: string,
  includeRootFolder = false,
  skipHidden = true,
  basePath = folderPath,
) => {
  if (typeof folderPath !== "string") {
    throw new BadRequest("Only string folder path supported for node.");
  }
  const result: FileOrFolderInfo[] = [];

  const stat = lstatSync(folderPath);

  if (stat.isFile()) {
    result.push({
      fullPath: folderPath,
      relativePath: basename(folderPath),
      parentPath: null,
      name: basename(folderPath),
      isFolder: false,
    });
    return result;
  } else {
    const items = readdirSync(folderPath);

    if (includeRootFolder) {
      result.push({
        fullPath: folderPath,
        relativePath: basename(folderPath),
        parentPath: null,
        name: basename(folderPath),
        isFolder: true,
      });
    }

    for (const item of items) {
      const fullPath = join(folderPath, item);
      const relativePath = relative(basePath, fullPath);
      const name = basename(relativePath);
      // skip hidden files or directories (those starting with a dot)
      if (skipHidden && name.startsWith(".")) {
        continue;
      }
      const parentPath =
        includeRootFolder && dirname(relativePath) === "."
          ? basename(folderPath)
          : dirname(relativePath);
      const stat = lstatSync(fullPath);

      if (stat.isDirectory()) {
        result.push({
          fullPath,
          relativePath,
          parentPath,
          name,
          isFolder: true,
        });

        // recursively traverse folder contents
        result.push(...traverse(fullPath, false, skipHidden, basePath));
      } else {
        result.push({
          fullPath,
          relativePath,
          parentPath,
          name,
          isFolder: false,
        });
      }
    }
    return result;
  }
};

export type FolderSource = string;
