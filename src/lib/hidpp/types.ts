/** A feature's type flags, decoded from the type byte (OpenLogi `feature/mod.rs`). */
export interface FeatureType {
  obsolete: boolean;
  hidden: boolean;
  engineering: boolean;
  manufacturingDeactivatable: boolean;
  complianceDeactivatable: boolean;
}

export function parseFeatureType(raw: number): FeatureType {
  return {
    obsolete: (raw & (1 << 7)) !== 0,
    hidden: (raw & (1 << 6)) !== 0,
    engineering: (raw & (1 << 5)) !== 0,
    manufacturingDeactivatable: (raw & (1 << 4)) !== 0,
    complianceDeactivatable: (raw & (1 << 3)) !== 0,
  };
}

/** A feature present in a device's feature table. */
export interface FeatureInfo {
  /** The globally unique feature id (e.g. `0x2201`). */
  id: number;
  /** The device-local index used to address the feature in requests. */
  index: number;
  /** Latest supported feature version (`0` on devices predating versioning). */
  version: number;
  type: FeatureType;
}
