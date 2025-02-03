import { FileOrFolderInfo } from "../folder";

export const traverse = async (
  entry: FileSystemEntry,
  includeRootFolder = false,
  skipHidden = true,
  rootPath = "",
): Promise<FileOrFolderInfo[]> => {
  const result: FileOrFolderInfo[] = [];

  const traverseRecursive = async (
    entry: FileSystemEntry,
    currentPath: string,
    rootPath = currentPath,
  ): Promise<void> => {
    // skip hidden files or directories (those starting with a dot)
    if (skipHidden && entry.name?.startsWith(".")) {
      return;
    }
    const fullPath = currentPath.endsWith("/")
      ? currentPath + entry.name
      : currentPath + "/" + entry.name;

    if (entry.isFile) {
      const file = await new Promise<any>((resolve) => {
        (entry as FileSystemFileEntry).file((file) => {
          resolve(file);
        });
      });
      result.push({
        fullPath,
        relativePath: fullPath.replace(rootPath + "/", ""),
        parentPath:
          currentPath === rootPath
            ? null
            : currentPath.replace(rootPath + "/", ""),
        name: entry.name,
        isFolder: false,
        file: file,
      });
    } else if (entry.isDirectory) {
      if (includeRootFolder || currentPath !== rootPath) {
        result.push({
          fullPath,
          relativePath: fullPath.replace(rootPath + "/", ""),
          parentPath:
            currentPath === rootPath
              ? null
              : currentPath.replace(rootPath + "/", ""),
          name: entry.name,
          isFolder: true,
        });
      }

      const reader = (entry as FileSystemDirectoryEntry).createReader();
      await new Promise<void>((resolve) => {
        reader.readEntries(async (entries) => {
          for (const child of entries) {
            await traverseRecursive(child, fullPath, rootPath);
          }
          resolve();
        });
      });
    }
  };

  if (entry.isDirectory) {
    await traverseRecursive(entry, rootPath);
  }

  return result;
};

export type FolderSource = FileSystemEntry;
