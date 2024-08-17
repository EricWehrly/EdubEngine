import CharacterType from "../../../../../js/entities/CharacterType";
import Events from "../../../events";
import { RemoveCharacterFromList } from "../../characters";
import Entity from "../Entity";

Events.List.CharacterDamaged = "CharacterDamaged";
Events.List.CharacterDied = "CharacterDied";

export interface Living {
    health?: number;
    maxHealth?: number;
    dead?: boolean;
    // TODO: change to 'alive' to be consistent
    isAlive?: boolean;
    damage?(amount: number, source: Entity): void;
}

export interface LivingOptions {
    health: number;
    maxHealth?: number;
    characterType?: CharacterType;
}

export interface CharacterDamagedEvent {
    character: Entity & Living;
    amount: number;
    attacker: Entity;
}

type Constructor<T = {}> = new (...args: any[]) => T;

export function MakeLiving<T extends Constructor<Entity>>(Base: T, options: LivingOptions) {
    return class extends Base implements Living {

        // TODO: value of health when options is null
        private _health = options?.health || options.characterType?.health;
        private _initialHealth = options?.maxHealth || options.characterType?.maxHealth || this._health;
    
        get size() { 
            // TODO: address this magic number
            return this.health / 40;
        }
    
        get health() {
            return this._health;
        }
    
        set health(newValue) {
            if(this.dead) return;

            this._health = newValue;
            if (this._health <= 0) this.die();
        }
    
        get maxHealth() {
            return this._initialHealth;
        }
    
        // TODO: wish this was 'protected'
        set maxHealth(newValue) {
            this._initialHealth = newValue;
        }
    
        get dead() {
            return this._health <= 0;
        }
    
        get isAlive() {
            return !this.dead
        }

        damage(amount: number, attacker: Entity) {
            this.health -= amount;

            const event : CharacterDamagedEvent = {
                character: this,
                amount,
                attacker: attacker
            };
            Events.RaiseEvent(Events.List.CharacterDamaged, event);
        }
    
        // private?
        // TODO: Should we just flag not alive and defer 'fading out' corpse?
        die() {
            Events.RaiseEvent(Events.List.CharacterDied, this);
            
            RemoveCharacterFromList(this);
        }
    }
}

export function IsLiving(obj: Entity): obj is Entity & Living {
    return (obj as Living).health !== undefined;
}
