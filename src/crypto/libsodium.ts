let sodium: any;
import libsodium from "libsodium-wrappers";
export async function loadSodium(): Promise<any> {
  if (sodium) return sodium;

  // const runtime = getRuntime();

  sodium = libsodium;
  //   throw new Error("Unsupported runtime environment");
  // }
  // if (runtime === "node") {
  //   const module = await import("../platform/node");
  //   sodium = (<any>module.default).default;
  //   await sodium.ready;
  // } else if (runtime === "browser") {
  //   const module = await import("../platform/browser");
  //   sodium = (<any>module.default).default;
  //   await sodium.ready;
  // } else if (runtime === "react-native") {
  //   const module = await import("../platform/react-native");
  //   sodium = module.default;
  // } else {
  //   throw new Error("Unsupported runtime environment");
  // }

  return sodium;
}

function getRuntime() {
  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }

  if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
    return "react-native";
  }

  if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    return "browser";
  }

  return "unknown";
}
