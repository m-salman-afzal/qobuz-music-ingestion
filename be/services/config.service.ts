import {ConfigData, ConfigRepository} from "../infra/database/repositories/config.repo";

export class ConfigService {
    static async getConfig() {
        const config = await ConfigRepository.getConfig();
        return config;
    }

    static async updateConfig(config: ConfigData) {
        const updatedConfig = await ConfigRepository.updateConfig(config);
        return updatedConfig;
    }
}
