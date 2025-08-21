let sodium: any;

export async function loadSodium(): Promise<any> {
  if (sodium) return sodium;

  // detect runtime env
  const runtime = getRuntime();
  console.log(runtime);

  if (runtime === "react-native") {
    console.log("is react native");
    const rnSodium = await import("react-native-libsodium");
    sodium = rnSodium.default || rnSodium;
    return sodium;
  }

  // browser or node (libsodium-wrappers with WASM)
  const sodiumWrappers = await import("libsodium-wrappers");
  await sodiumWrappers.ready;
  sodium = sodiumWrappers.default;
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
