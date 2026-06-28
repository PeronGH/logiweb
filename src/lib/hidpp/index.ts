export { HidppChannel, type RawReport, type ReportListener } from "./channel";
export { HidppDevice, type FeatureCtor } from "./device";
export { HidppError, HidppErrorCode, errorCodeName } from "./errors";
export {
  ProtocolVersion,
  DIRECT_DEVICE_INDEX,
  type VersionInfo,
} from "./protocol";
export type { FeatureInfo, FeatureType } from "./types";
export {
  isWebHidSupported,
  requestLogitechDevices,
  getGrantedLogitechDevices,
  LOGITECH_VENDOR_ID,
} from "./webhid";
export {
  isReceiver,
  enumeratePairedDevices,
  type PairedDevice,
} from "./receiver";

export { RootFeature, type RootFeatureInfo } from "./features/root";
export {
  FeatureSetFeature,
  type FeatureSetEntry,
} from "./features/feature-set";
export {
  DeviceTypeAndNameFeature,
  DeviceType,
} from "./features/device-type-and-name";
export {
  UnifiedBatteryFeature,
  BatteryLevel,
  BatteryStatus,
  type BatteryInfo,
  type BatteryCapabilities,
} from "./features/unified-battery";
export { AdjustableDpiFeature, parseDpiList } from "./features/adjustable-dpi";
export {
  SmartShiftFeature,
  WheelMode,
  type RatchetControlMode,
  type RatchetControlModeChange,
} from "./features/smartshift";
export {
  SmartShiftEnhancedFeature,
  type SmartShiftEnhancedInfo,
  type SmartShiftEnhancedStatus,
  type SmartShiftEnhancedChange,
} from "./features/smartshift-enhanced";
export { ReportRateFeature } from "./features/report-rate";
