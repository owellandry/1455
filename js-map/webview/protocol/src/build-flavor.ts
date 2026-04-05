export const BUILD_FLAVOR_VALUES = {
  Dev: "dev",
  Agent: "agent",
  Nightly: "nightly",
  InternalAlpha: "internal-alpha",
  PublicBeta: "public-beta",
  Prod: "prod",
} as const;

export type BuildFlavor =
  (typeof BUILD_FLAVOR_VALUES)[keyof typeof BUILD_FLAVOR_VALUES];

export const BUILD_FLAVORS = Object.values(
  BUILD_FLAVOR_VALUES,
) as ReadonlyArray<BuildFlavor>;

export const BuildFlavor = {
  ...BUILD_FLAVOR_VALUES,
  values: BUILD_FLAVORS,
  help: BUILD_FLAVORS.join(", "),
  isValid(value: string): value is BuildFlavor {
    return (BUILD_FLAVORS as ReadonlyArray<string>).includes(value);
  },
  parse(raw: string | undefined): BuildFlavor | null {
    const trimmed = raw?.trim();
    if (!trimmed) {
      return null;
    }
    if (BuildFlavor.isValid(trimmed)) {
      return trimmed;
    }
    return null;
  },
} as const;
