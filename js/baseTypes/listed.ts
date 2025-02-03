export default class Listed {
    private _name;
    get name() { return this._name; }

    static Get<T extends Listed>(this: new (...args: any[]) => T, item: string | { name: string }): T | null {
        const list = (this as any).List;
        const lowerCaseList = Object.keys(list).reduce((acc, key) => {
            acc[key.toLowerCase()] = list[key];
            return acc;
        }, {} as { [key: string]: T });
        if(typeof item == "string") {
            const lowerCaseItem = item.toLowerCase();
            if(!lowerCaseList.hasOwnProperty(lowerCaseItem)) {
                console.warn(`Listed ${this.name} does not contain ${item}.`);
                return null;
            }
            return lowerCaseList[lowerCaseItem] as T;
        }
        else if(item?.name) return list[item.name] as T;
        else {
            console.warn(`Don't know how to get ${item}`);
            return null;
        }
    }

    // TODO: we can add a "destroy" method
    // that removes from list
    // can be overridden in a extending class
    // and has a setTimeout to check if the element is undefined
    // 'cause if it ain't, maybe the gc didn't get it (memory leak?)

    constructor(options: { name: string }) {
        if(!options.name) throw `Cannot create ${this.constructor.name} without 'name' property.`;

        this._name = options.name;

        const list = (this.constructor as any).List = (this.constructor as any).List || {};

        list[options.name] = this;
        const constructorName = String(this.constructor.name);

        const globalWindow = window as any;
        if (globalWindow && !globalWindow[constructorName]) {
            globalWindow[constructorName] = {
                List: list
            }
        }
    }
}
