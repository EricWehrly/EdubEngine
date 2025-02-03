import Events from "../events";

Events.List.ConfigurationChanged = 'ConfigurationChanged';

export interface ConfigurationOptions {
    key: string;
    default?: any;
}

export default class Configuration {
    private static _instance: Configuration;

    private constructor() {
        // TODO: load data from persistence
    }

    public static get Instance(): Configuration {
        return this._instance || (this._instance = new this());
    }

    public static Get(options: string | ConfigurationOptions): any {
        return Configuration.Instance.Get(options);
    }

    public static Set(key: string, value: any): void {
        return Configuration.Instance.Set(key, value);
    }

    private _config: any = {};

    public Get(options: string | ConfigurationOptions): any {
        if (typeof options === 'string') {
            return this._config[options];
        } else {
            if (options.default && this._config[options.key] === undefined) {
                this._config[options.key] = options.default;
                return options.default;
            }
            return this._config[options.key];
        }
    }

    public Set(key: string, value: any): void {
        this._config[key] = value;
        Events.RaiseEvent(Events.List.ConfigurationChanged, { key, value });
    }
}

declare global {
    interface Window {
        Configuration: Configuration;
    }
}

window.Configuration = Configuration.Instance;
