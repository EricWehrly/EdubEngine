class Logger {

    static readonly instance: Logger = new Logger();

    constructor() {
        this.log = console.log;
        this.error = console.error;
    }

    log(message: string, ...optionalParams: any[]) {        
        if (!this.shouldSkipLog()) {
            console.log(message, ...optionalParams);
        }
    }

    error(message: string, ...optionalParams: any[]) {        
        if (!this.shouldSkipLog()) {
            console.error(message, ...optionalParams);
        }
    }

    warn(message: string, ...optionalParams: any[]) {        
        if (!this.shouldSkipLog()) {
            console.warn(message, ...optionalParams);
        }
    }

    debug(message: string, ...optionalParams: any[]) {        
        if (!this.shouldSkipLog()) {
            console.debug(message, ...optionalParams);
        }
    }

    private shouldSkipLog(): boolean {
        // @ts-expect-error: process might not be defined in non-node environments
        if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'test') {
            return true;
        }
        return false;
    }
}

export default Logger.instance;
