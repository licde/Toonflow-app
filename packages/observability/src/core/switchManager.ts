import type { LogCategory, SwitchConfig } from "../types";
import { applyProfile, type ProfileName } from "../profiles";

export class SwitchManager {
  private config: SwitchConfig;

  constructor(initial: SwitchConfig) {
    this.config = structuredClone(initial);
  }

  get(): SwitchConfig {
    return structuredClone(this.config);
  }

  update(patch: Partial<SwitchConfig>) {
    this.config = {
      ...this.config,
      ...patch,
      transports: { ...this.config.transports, ...patch.transports },
      categories: { ...this.config.categories, ...patch.categories },
      modules: { ...this.config.modules, ...patch.modules },
      vendors: { ...this.config.vendors, ...patch.vendors },
      features: { ...this.config.features, ...patch.features },
    };
  }

  setProfile(name: ProfileName) {
    this.config = applyProfile(this.config, name);
  }

  isCategoryEnabled(category: LogCategory): boolean {
    return this.config.categories[category] !== false;
  }

  isModuleEnabled(module: string): boolean {
    return this.config.modules[module] !== false;
  }

  isVendorEnabled(vendorId: string): boolean {
    return this.config.vendors[vendorId] !== false;
  }
}
