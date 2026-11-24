// Polyfills for the in-memory module test harness on older Node.js versions.
if (!Symbol.dispose) {
  Object.defineProperty(Symbol, "dispose", { value: Symbol.for("Symbol.dispose") });
}

const setProto = Set.prototype as unknown as Record<string, unknown>;
if (!setProto.isSubsetOf) {
  Object.defineProperty(Set.prototype, "isSubsetOf", {
    value: function isSubsetOf<T>(this: Set<T>, other: Set<T>) {
      return [...this].every((value) => other.has(value));
    },
  });
}
