// @ts-nocheck
import { AssignWithUnderscores, copyPublicProperties } from '../util/javascript-extensions.mjs'
import { TechnologyTypes } from '../TechnologyTypes';
import Events from '../events.mjs';
import './character-graphics.mjs';
import { Defer } from '../loop.mjs';
import Faction from './faction.mjs';
import Tooltip from '../ui/tooltip.mjs';
import Entity from './character/Entity';
import { Combatant } from './character/Combatant';

// @ts-ignore
Events.List.CharacterCreated = "CharacterCreated";
// @ts-ignore
Events.List.CharacterDied = "CharacterDied";
// @ts-ignore
Events.List.CharacterTargetChanged = "CharacterTargetChanged";
// @ts-ignore
Events.List.PlayerMoved = "PlayerMoved";
// @ts-ignore
Events.List.PlayerChunkChanged = "PlayerChunkChanged";
// @ts-ignore
Events.List.PlayerHealthChanged = "PlayerHealthChanged";

// TODO: #private properties rather than _private
export default class Character extends Combatant {

    // maybe we can find a way around this (better than how we do in game.js)
    // but for now hack in some dumb reference stuff
    static #LOCAL_PLAYER: Character;

    static get LOCAL_PLAYER() {
        return Character.#LOCAL_PLAYER;
    }

    static set LOCAL_PLAYER(value) {
        Character.#LOCAL_PLAYER = value;
    }

    static get(options) {

        let charList = CHARACTER_LIST;
        for(var key of Object.keys(options)) {
            charList = charList.filter(x => x[key] == options[key]);
        }

        return charList;
    }

    toolTip: Tooltip;
    controller: any; // inputdevice

    #faction = null;
    #research = {};

    get faction() { return this.#faction; }

    #thornMultiplier = 1;
    get thornMultiplier() { return this.#thornMultiplier; }
    set thornMultiplier(newValue) { this.#thornMultiplier = newValue; }

    constructor(options = {}) {
        super(options);

        if(options.technologies) {
            for(var tech of options.technologies) {
                this.AddTechnology(tech);
            }
            delete options.technologies;
        }

        if(options.faction) {
            this.#faction = options.faction;
            delete options.faction;
        }

        if(options.research) {
            this.#research = options.research;
            delete options.research;
        }

        AssignWithUnderscores(this, options);

        this.color = options.color;
        // TODO: Find a better way to have a cancellable default?
        if (options.color === null) delete this.color;
        // options.image

        if(options.isPlayer) {
            this.#faction = new Faction({ 
                name: this.name,
                color: this.color
            });
        }

        // @ts-ignore
        Events.RaiseEvent(Events.List.CharacterCreated, this, {
            isNetworkBoundEvent: true
        });

        // @ts-ignore
        // TODO: move to graphic class 
        Events.Subscribe(Events.List.CharacterDied, this.characterDied.bind(this));
    }

    think() {
        if (this.ai) this.ai.think();
        else if(this.isPlayer) {

            // for now just target the closest thing. get more complicated later
            let dist = 5;
            const attack = this.getEquipped(TechnologyTypes.ATTACK);
            if(attack && attack.range) dist = attack.range;
            const closestOptions = {
                distance: dist,
                filterChildren: true,
                // priorities: [CharacterType.]
            };
            this.target = this.getClosestEntity(closestOptions);

            /*
            if(this.shouldStopTargeting()) {
                this.target = null;
            }
            // TODO: Use range of equipped attack?
            if (!this.target || !this.target.isAlive) {
                this.target = this.getClosestEntity({ distance: 5 });
            }
            */
        }

        this.statusEffectThink();
    }

    pointAtTarget(target) {

        if (target) {
            if (this.position.x != target.position.x
                || this.position.y != target.position.y) {
                if (this.position.x < target.position.x) this._velocity.x = 1;
                else if (this.position.x > target.position.x) this._velocity.x = -1;
                if (this.position.y < target.position.y) this._velocity.y = 1;
                else if (this.position.y > target.position.y) this._velocity.y = -1;
            }
        } else {
            this._velocity.x = 0;
            this._velocity.y = 0;
        }
    }

    shouldMoveToTarget() {
        return this.ai != null && this.target != null;
    }

    shouldStopOnAxis(axis: string, amount: number) {
        return Math.abs(this._position[axis] - this.target.position[axis]) < this.speed * amount;
    }

    atTarget(axis: string) {
        return this.target && this.target.position[axis] == this._position[axis];
    }

    move(amount: number) {

        if (this.shouldMoveToTarget()) {
            const axes = ['x', 'y'];
            for (const axis of axes) {
                if (!this.atTarget(axis)) {
                    if (this.shouldStopOnAxis(axis, amount)) {
                        this._position[axis] = this.target.position[axis];
                        this._velocity[axis] = 0;
                    } else {
                        this._position[axis] += this._velocity[axis] * this.speed * amount;
                    }
                }
            }
        } else {
            this._position.x += this._velocity.x * this.speed * amount;
            this._position.y += this._velocity.y * this.speed * amount;
        }

        // TODO: We can probly extract to a method (#positionUpdated)
        // and call from within the position setter
        if(!this._position.equals(this.lastPosition)) {
            if(this.isPlayer) {
                Events.RaiseEvent(Events.List.PlayerMoved, {
                    character: this,
                    from: this.lastPosition,
                    to: this._position
                    }, {
                    isNetworkBoundEvent: true
                });
                
                if(!this._position.chunk.equals(this.lastPosition?.chunk)) {
                    Events.RaiseEvent(Events.List.PlayerChunkChanged, {
                        character: this,
                        from: this.lastPosition?.chunk,
                        to: this._position.chunk
                    }, {
                        isNetworkBoundEvent: true
                    });
                }
            }
            this.lastPosition = copyPublicProperties(this._position)
        }
    }

    getScreenPosition() {

        // TODO: get grid size constant from css
        const gridSize = 32;
        return {
            x: this.position.x * gridSize,
            y: this.position.y * gridSize
        };
    }

    // TODO: Make private ... and push down?
    shouldFilterCharacter(character: Entity, options) {

        if (options.filterChildren && character.parent == this) {
            return true;
        }
        if (options.hostile != null && character.isHostile != options.hostile) {
            return true;
        }
        if (options.isPlayer != null && character.isPlayer != options.isPlayer) {
            return true;
        }
        if(options.characterType != null && character.characterType != options.characterType) {
            return true;
        }
        if(options.exclude && options.exclude.includes(character)) {
            return true;
        }
        if(options.grown != null && character.isGrown != options.grown) {
            return true;
        }
        if(options.faction && character.faction != options.faction) {
            return true;
        }
        if(options.characterProperties) {
            for(var key of Object.keys(options.characterProperties)) {
                if(character[key] != options.characterProperties[key]) {
                    return true;
                }
            }
        }

        return false;
    }

    removeGraphic() {

        if(this.graphic) {
            console.log('removing dying entity graphic');
            document.getElementById("playfield").removeChild(this.graphic);
            delete this.graphic;
        }
    }

    characterDied(entity) {
        if(entity.equals(this)) {
            this.removeGraphic();
        }
    }

    #statusEffects = {};

    getStatusEffect(statusEffect) {

        if(!(statusEffect in this.#statusEffects)) {
            this.#statusEffects[statusEffect] = performance.now();
        }
        
        return this.#statusEffects[statusEffect];
    }

    statusEffectThink() {
        for(var key in Object.keys(this.#statusEffects)) {
            const statusEffect = this.#statusEffects[key];
            if(statusEffect > performance.now()) {
                delete this.#statusEffects[key];
            }
        }
    }

    /**
     * 
     * @param {StatusEffect} statusEffect 
     * @param {int} duration ms
     */
    applyStatusEffect(statusEffect, duration) {

        this.#statusEffects[statusEffect] = this.getStatusEffect(statusEffect) + duration;

        const now = performance.now();
        const options = {
            startTime: now,
            endTime: now + duration,
            lastInterval: 0,
            target: this.target,
            duration
        }
        if(options.target == null) debugger;
        Defer(function() {
            statusEffect.callback(options)
        }, statusEffect.interval + 1);
    }
}

if(window) window.Character = Character;
