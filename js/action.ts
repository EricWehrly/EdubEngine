import Listed from './baseTypes/listed';
import Events from './events';
import Entity from './entities/character/Entity';
import Menu from './ui/menu';
import { Combative } from './entities/character/mixins/Combative';
import { Sentient } from './entities/character/mixins/Sentient';

Events.List.ActionFired = "ActionFired";

export interface ActionOptions {
    enabled?: boolean;
    oncePerPress?: boolean;
    delay?: number;
    isCharacterControl?: boolean;
    isMenuAction?: boolean;
    callback?: Function;
    name: string;
}

// todo: I think we need to "fix" this by implementing "ActionType"s.
// These should each be action TYPES but instead they're action INSTANCES
// which prevents us from making instances from them
export default class Action extends Listed {
    
    static List: { [key: string]: Action } = {};

    static #disabledForMenu: Action[] = [];

    static {
        Action.MenuClosed();

        Events.Subscribe(Events.List.GameStart, function() {
            
            Events.Subscribe(Events.List.MenuOpened, Action.MenuOpened);
            Events.Subscribe(Events.List.MenuClosed, Action.MenuClosed);
        });
    }
    
    static MenuOpened() {

        for(var index in Action.List) {
            const action = Action.List[index];
            if(action.enabled != false && action.isCharacterControl) {
                Action.#disabledForMenu.push(action);
                action.enabled = false;
            } else if(action.isMenuAction) {
                action.enabled = true;
            }
        }
    }
    
    static MenuClosed() {
        
        for(var index in Action.List) {
            const action = Action.List[index];
            if(action.isMenuAction) {
                action.enabled = false;
            }
        }
        for(var action of Action.#disabledForMenu) {
            action.enabled = true;
        }
        Action.#disabledForMenu = [];
    }

    lastFired: number = null;
    #enabled: boolean = null;
    #oncePerPress: boolean = null;
    #delay: number = null;
    #isCharacterControl = false;
    #isMenuAction = false;
    target: Entity = null;
    private _callback: Function = null;
    get enabled() { return this.#enabled; }
    set enabled(value) { this.#enabled = value; }
    get oncePerPress() { return this.#oncePerPress; }
    get delay() { return this.#delay; }
    get isCharacterControl() { return this.#isCharacterControl; }
    get isMenuAction() { return this.#isMenuAction; }
    get callback() { return this._callback; }

    constructor(options: ActionOptions) {

        super(options);

        // TODO: We should try "auto-mapping" some of this ...
        if(options.enabled != null) this.#enabled = options.enabled;
        if(options.oncePerPress != null) this.#oncePerPress = options.oncePerPress;
        if(options.delay != null) this.#delay = options.delay;
        if(options.isCharacterControl != null) this.#isCharacterControl = options.isCharacterControl;
        if(options.isMenuAction != null) {
            this.#isMenuAction = options.isMenuAction;
            // menu actions are 'once per press' by default
            if(options.oncePerPress == null) this.#oncePerPress = true;
        }

        if (options.callback != null) {
            const baseCallback = options.callback;

            this._callback = function (options: any = {}) {

                if (!this.#checkDelay(this)) return;

                const result = baseCallback.bind(this)(options);

                Events.RaiseEvent(`${Events.List.ActionFired}-${this.name}`, options);

                return result;
            }
        }
    }

    #checkDelay(thing: Action) {

        if (thing.delay && thing.lastFired &&
            performance.now() - thing.lastFired < thing.delay) return false;
        else if (thing.delay) thing.lastFired = performance.now();

        return true;
    }
}

// TODO: Read from config json?
new Action({
    name: 'move_up',
    isCharacterControl: true,
    callback: function (options: any) {
        if (options?.character?.desiredMovementVector?.y != null) {
            options.character.desiredMovementVector.y = -1;
        }
    }
});

new Action({
    name: 'move_down',
    isCharacterControl: true,
    callback: function (options: any) {
        if (options?.character?.desiredMovementVector?.y != null) {
            options.character.desiredMovementVector.y = 1;
        }
    }
});

new Action({
    name: 'move_left',
    isCharacterControl: true,
    callback: function (options: any) {
        if (options?.character?.desiredMovementVector?.x != null) {
            options.character.desiredMovementVector.x = -1;
        }
    }
});

new Action({
    name: 'move_right',
    isCharacterControl: true,
    callback: function (options: any) {
        if (options?.character?.desiredMovementVector?.x != null) {
            options.character.desiredMovementVector.x = 1;
        }
    }
});

function menuPrevious() {
    Menu.Current.selectPrevious();
}

function menuNext() {
    Menu.Current.selectNext();
}

new Action({
    name: 'menu_up',
    isMenuAction: true,
    callback: menuPrevious
});

new Action({
    name: 'menu_down',
    isMenuAction: true,
    callback: menuNext
});

new Action({
    name: 'menu_left',
    isMenuAction: true,
    callback: menuPrevious
});

new Action({
    name: 'menu_right',
    isMenuAction: true,
    callback: menuNext
});

new Action({
    name: 'menu_previous',
    isMenuAction: true,
    callback: menuPrevious
});

new Action({
    name: 'menu_next',
    isMenuAction: true,
    callback: menuNext
});

new Action({
    name: 'attack',
    isCharacterControl: true,
    callback: function (options: any) {

        if(!options.character) {
            console.warn("No character. Fix this.");
            return 0;
        }

        const combative = options.character as Combative & Sentient;
        if(combative.target instanceof Entity) {
            return combative.attack(combative.target);
        }

        return 0;
    }
});

new Action({
    name: 'openMenu',
    enabled: true,
    oncePerPress: true,
    callback: function (options: any) {

        if(options?.parameters?.length > 0) {
            const menu = Menu.Get(options?.parameters[1]);
            menu.visible = !menu.visible;
        } else {
            console.warn("Not sure which menu to open.");
        }
    }
});

new Action({
    name: 'menu_interact',
    enabled: false,
    oncePerPress: true,
    delay: 1000,
    callback: function (options: any) {

        Menu.Current.menuAction({
            menu: Menu.Current
        });
    }
});

declare global {
    interface Window {
        Action: typeof Action;
    }
}

if (window) window.Action = Action;
