// these actions should really be in the game, not the engine
import Character from '../../js/entities/character-extensions.mjs';
import Listed from './baseTypes/listed.mjs';
import Requirements from './requirements.mjs';
import Events from './events.mjs';
import Menu from './ui/menu.mjs';
import Technology from './technology.mjs';

Events.List.ActionFired = "ActionFired";

export default class Action extends Listed {

    // TODO: Read from config json?
    static {
        new Action({
            name: 'move_up',
            callback: function (options) {
                if (options?.character?.velocity?.y != null) {
                    options.character.velocity.y = -1;
                }
            }
        });

        new Action({
            name: 'move_down',
            callback: function (options) {
                if (options?.character?.velocity?.y != null) {
                    options.character.velocity.y = 1;
                }
            }
        });

        new Action({
            name: 'move_left',
            callback: function (options) {
                if (options?.character?.velocity?.x != null) {
                    options.character.velocity.x = -1;
                }
            }
        });

        new Action({
            name: 'move_right',
            callback: function (options) {
                if (options?.character?.velocity?.x != null) {
                    options.character.velocity.x = 1;
                }
            }
        });

        new Action({
            name: 'attack',
            callback: function (options) {
                // TODO: Pull in enum from technology class
                const equipment = options?.character?.equipment;
                if(equipment == null) return false;

                const equipped = equipment[Technology.Types.ATTACK];
                if (equipped == null) {
                    console.log("Character has no attack skill equipped!");
                    return;
                }

                // TODO: This isn't going to track a per-character last action time. We need that.
                if (!this.checkDelay(equipped)) return false;

                if (!this.inRange(equipped, options.character)) return false;

                // decided not to try to "do" poison
                // it was going to maybe be a "buff" (attackModifier) _on_ a weapon,
                // which applied a dot to an enemy?
                // we have none of that
                // maybe go implement bleed
                if(equipment[Technology.Types.ATTACK_MODIFIER]) {
                    
                    //damage, damageInterval ?
                }

                // TODO: visual and audio cues
                if (options?.character?.target) {
                    if (equipped.sound) equipped.sound.play();
                    options.character.target.health -= equipped.damage;
                }

                return true;
            }
        });

        // maybe not allowed to do this at first
        new Action({
            name: 'subdivide',
            // TODO: Maybe we should just have "on press" vs "on held" ...
            oncePerPress: true,
            callback: function (options) {
                options.character.Subdivide();
            }
        })

        // TODO: unavailable if a subdivided piece is already studying the target
        new Action({
            name: 'study',
            enabled: false,
            oncePerPress: true,
            delay: 1000,
            callback: function (options) {

                const piece = options.character.Subdivide({
                    purpose: Character.Purposes["study"],
                    target: Action.List["study"].target
                });
            }
        });

        // TODO: unavailable if a subdivided piece is already nomming the target
        new Action({
            name: 'consume',
            enabled: false,
            oncePerPress: true,
            delay: 1000,
            callback: function (options) {

                const piece = options.character.Subdivide({
                    purpose: Character.Purposes["consume"],
                    target: Action.List["consume"].target
                });
            }
        });

        // TODO: generic "open menu" action that has variable context?
        new Action({
            name: 'buildMenu',
            enabled: true,
            oncePerPress: true,
            // delay: 1000,
            callback: function (options) {

                const buildMenu = Menu.Get("build");
                buildMenu.visible = !buildMenu.visible;
            }
        });

        new Action({
            name: 'menu_interact',
            enabled: false,
            oncePerPress: true,
            delay: 1000,
            callback: function (options) {

                // ok ... how do we know which menu is in context? 
                // for now we can just assume only 1 menu ...
                const currentMenu = Menu.MENU_LIST[0];
                // TODO: can we pass ... from the menu calling somehow? into this method?
                currentMenu.menuAction({
                    menu: currentMenu
                });
            }
        });
    }

    #enabled = null;
    #oncePerPress = null;
    #delay = null;
    get enabled() { return this.#enabled; }
    set enabled(value) { this.#enabled = value; }
    get oncePerPress() { return this.#oncePerPress; }
    get delay() { return this.#delay; }

    constructor(options = {}) {

        super(options);

        if(options.enabled) this.#enabled = options.enabled;
        if(options.oncePerPress) this.#oncePerPress = options.oncePerPress;
        if(options.delay) this.#delay = options.delay;

        if (options.callback) {
            const baseCallback = options.callback;

            this.callback = function (options = {}) {

                if (!Requirements.met(this, options.character)) return;

                if (!this.checkDelay(this)) return;

                options.result = baseCallback.bind(this)(options);

                Events.RaiseEvent(`${Events.List.ActionFired}-${this.name}`, options);
            }
        }
    }

    checkDelay(thing) {

        if (thing.delay && this.lastFired &&
            performance.now() - this.lastFired < thing.delay) return false;
        else if (thing.delay) this.lastFired = performance.now();

        return true;
    }

    inRange(thing, character) {

        if (thing.range) {
            if (!character?.target) return false;

            if (character.getDistance(character.target) > thing.range) return false;
        }

        return true;
    }
}
