export const importDynamic = (path: string): any => {
  const module = require(path);
  return module.default || module;
}; 