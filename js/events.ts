import { generateId } from "./util/javascript-extensions.mjs";
// import NetworkMessenger from './network/network-messenger.mjs';

export interface SubscribeOptions {
    callback?: Function;
    oneTime?: boolean;
    onlyPlayerEvents?: boolean;
    priority?: number;
    before?: string;
}

export interface RaiseEventOptions {
    eventId?: string;
    eventName?: string;
    removeAfterRaise?: boolean;
    isNetworkBoundEvent?: boolean;
    isNetworkOriginEvent?: boolean;
    finalFire?: boolean;
    detail?: Object;
}

interface Subscription extends SubscribeOptions {
    subscriptionId: string;
}

export interface GameEvent {
    // eventId is created in the generation -- present for the 'output' GameEvent, not its input
    eventId?: string;
    // by marking this definitively distinct property as non-nullable, we can browse errors
    // to try to find anywhere raising a GameEvent with an entity or other object that legitimately has an id property
    gameEventSpecificPropertyToForceInheritance?: boolean;
}
type EventCallbackFunction = (event: GameEvent) => void;

// TODO: extends Listed
export default class Events {

    static List: { [key: string]: string } = {
        "ScriptsLoaded": "ScriptsLoaded",
        "DataLoaded": "DataLoaded",
        "GameStart": "GameStart"
    }

    static #Subscriptions: Record<string, Array<Subscription>> = {};

    static #FiredEvents: Record<string, Object> = {};

    static Context = new Map<string, Object>();

    /**
     * @param {String | Array<String>} eventNames The enum name from Events.List
     * @param {Function} callback The callback method of the subscriber.
     * @param {Object} options
     * @param {Boolean} [options.oneTime] Whether the subscription should only be raised once.
     * @param {Boolean} [options.onlyPlayerEvents] Whether the subscription should only be raised for player events.
     * @param {Number} [options.priority] The priority of the subscription. Higher numbers are called first.
     * @param {String} [options.before] The name of the function that this subscription should be called before.
     * @returns the id of the subscription if successful
     */
    static Subscribe(eventNames: string | Array<string>, callback: EventCallbackFunction, options: SubscribeOptions = {}) {

        // TODO: check inputs for bad values

        if (Array.isArray(eventNames)) {
            eventNames.forEach(function (eventName) {
                Events._subscribe(eventName, callback, options);
            });
        } else {
            return Events._subscribe(eventNames, callback, options);
        }
    }

    /**
     * 
    * @param {String} eventName The enum name from Events.List
    * @param {Object} detail The details of the event (usually the subject of the action). Varies by event type.
    * @param {Object} [options] 
    * @param {Boolean} [options.removeAfterRaise] Whether to de-register the event after the first time that it is raised, preventing subsequent calls from resulting in a raised event.
    * @param {Boolean} [options.isNetworkBoundEvent] Whether the event should go to the network.
    * @param {Boolean} [options.isNetworkOriginEvent] Did the event originate from a machine other than this one?
    * @param {Boolean} [options.finalFire] This is the last time the event will fire. All registrations after will fire immediately.
    */
    static RaiseEvent(eventName: string, detail: Object, options: RaiseEventOptions = {}) {

        if(!detail) detail = {};    // because null is allowed

        const propgatedDetails = {
            eventId: generateId(),
            ...detail
        };

        if (options?.isNetworkBoundEvent) {
            // NetworkMessenger.TransmitEvent(eventName, propgatedDetails);
        }

        if (options?.finalFire == true) {
            if (eventName in Events.#FiredEvents) {
                console.warn(`${eventName} already called finalFire`);
            }

            Events.#FiredEvents[eventName] = {
                detail,
                options
            };
        }

        var subscribedEvents = Events.#Subscriptions[eventName];
        if (!subscribedEvents) return;   // handle no subscriptions
        subscribedEvents = subscribedEvents.slice(0)   // create an unmodified copy, to survive modifications

        for (var subscription of subscribedEvents) {
            //@ts-expect-error
            if(subscription.onlyPlayerEvents && detail?.character?.isPlayer != true) continue;

            Events.Context.set(propgatedDetails.eventId, detail);
            Events._raiseSubscription(subscription.callback, {
                detail: propgatedDetails,
                eventName
            });

            if (subscription.oneTime || options?.removeAfterRaise == true) {
                console.warn("Didn't implement unsubscribe ...");
                // Events.Unsubscribe(subscription.subscriptionId);
            }
        }
        Events.Context.delete(propgatedDetails.eventId);
    }

    static EventHasFired(eventName: string): boolean {
        return Events.#FiredEvents[eventName] != undefined;
    }

    /**
     * @param {Function} callback The callback method of the subscriber.
     * @param {Object} options.detail The details of the event (usually the subject of the action). Varies by event type.
     * @param {String} options.eventName From Events.List
     */
    private static _raiseSubscription(callback: Function, options: RaiseEventOptions) {

        // TODO: This is going to repeat instantiation inside the loop
        // but whatever that's like 20 calls tops? fix it later
        const callbackOptions = {
            isNetworkOriginEvent: options?.isNetworkOriginEvent || false
        };

        try {
            callback(options.detail, callbackOptions);
        } catch (ex) {
            if (options.eventName) console.error(`Issue firing subscription for event ${options.eventName}`);
            if (callback.name != "") {
                console.log(callback.name);
            }
            console.error(ex);
            debugger;
        }
    }

    // Unsubscribe

    // subscribeOnce

    /**
     * @returns the id of the subscription if successful
     * @returns null if the event has already fired for the last time
     * but in that case it fires the subscription immediately
     */
    private static _subscribe(eventName: string, callback: Function, options: SubscribeOptions): string {

        if (eventName == undefined) debugger;

        if (eventName in Events.#FiredEvents) {
            console.debug(`Immediately firing subscription for already fired event ${eventName}.`);
            const firedEvent = Events.#FiredEvents[eventName];
            Events._raiseSubscription(callback, {
                eventName,
                ...firedEvent
            });
            return null;
        }

        const subscriptionId = generateId();

        if (!(eventName in Events.#Subscriptions)) Events.#Subscriptions[eventName] = [];
        const subscriptionCount = Events.#Subscriptions[eventName].push({
            subscriptionId,
            callback
        });
        // these options are not used
        // if (options) Object.assign(Events.#Subscriptions[eventName][length - 1], options);

        Events.#Subscriptions[eventName].sort(Events.#sortEventsArray);

        return subscriptionId;
    };

    static #sortEventsArray(first: Subscription, second: Subscription) {

        if (first.before && second.callback.name && second.callback.name == first.before) {
            return -1;
        }
        if (second.before && first.callback.name && first.callback.name == second.before) {
            return 1;
        }

        if (first.priority > second.priority) return -1;
        else if (second.priority > first.priority) return 1;
        return 0;
    }
}

declare global {
    interface Window {
        GameEvents: typeof Events;
    }
}

if (window) window.GameEvents = Events;
