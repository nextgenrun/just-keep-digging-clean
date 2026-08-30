import { STAR_SANCTUARY_CONFIG } from "../../values/starSanctuary.js";
import { BrowserStorageRepository } from "./BrowserStorageRepository.js";

export class StarConsumptionAcknowledgementStore {
  constructor(
    saveSlot = 1,
    storageRepository = new BrowserStorageRepository(),
    config = STAR_SANCTUARY_CONFIG,
  ) {
    this.saveSlot = Math.max(1, Math.floor(Number(saveSlot) || 1));
    this.storageRepository = storageRepository;
    this.config = config;
  }

  get storageKey() {
    return `${this.config.consumption.acknowledgement.storageKeyPrefix}${this.saveSlot}`;
  }

  isAcknowledged() {
    const record = this.storageRepository.readJson(this.storageKey, null);
    return record?.version
      === this.config.consumption.acknowledgement.storageVersion
      && record?.acknowledged === true;
  }

  acknowledge() {
    return this.storageRepository.writeJson(this.storageKey, {
      version: this.config.consumption.acknowledgement.storageVersion,
      acknowledged: true,
    });
  }
}
