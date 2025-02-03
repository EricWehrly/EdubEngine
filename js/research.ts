import Listed from './baseTypes/listed';
import Menu from './ui/menu';
import { SCREEN_ZONE } from './ui/ui-element';
import KeyboardController from '../../js/controls/KeyboardController';
import Events from './events';
import { Defer } from "./Loop";
import Entity from './entities/character/Entity';
import MenuItem from './ui/MenuItem';

Events.List.ResearchEnabled = "ResearchEnabled";
Events.List.ResearchFinished = "ResearchFinished";

export interface ResearchOptions {
    cost?: number;
    callback?: Function;
}

export default class Research extends Listed {

    static #UI_MENU_RESEARCH: Menu;

    static DoResearch(context: { menu: Menu }) {

        if(context?.menu?.selected?.enabled === false) return;
        const selectedResearch = context?.menu?.selected?.context?.research;
        selectedResearch.setText(`${selectedResearch.name}<br>Researching...`);
        selectedResearch.addClass("disabled");
        context.menu.selected.enabled = false;

        const researchers = Entity.get({
            name: "Researcher"
        });
        const researchMultiplier = 1 + (researchers.length / 10);
        const researchCost = selectedResearch.cost / researchMultiplier;

        // TODO: when used, start counting down until the research is done
        // (later that'll make it easier to add visuals)
        Defer(function() {
            if(selectedResearch.callback) selectedResearch.callback();
            context?.menu.removeItem(context.menu.selected);
            Events.RaiseEvent(Events.List.ResearchFinished, this);
            Events.RaiseEvent(`${Events.List.ResearchFinished}-${selectedResearch.name}`, this);
        }, researchCost * 1000);
    }

    static {

        // we shouldn't have to do this but there's a whole ugly call stack down to UIElement if we don't
        Events.Subscribe(Events.List.ScriptsLoaded, function () {
            Research.#UI_MENU_RESEARCH = new Menu({
                screenZone: SCREEN_ZONE.MIDDLE_RIGHT,
                name: "Research",
                visible: false,
                menuAction: Research.DoResearch
            });

            KeyboardController.AddDefaultBinding("openMenu/research", "r");
        });

    }

    #cost = 0;
    get cost() { return this.#cost; }
    
    #callback: Function = null;
    get callback() { return this.#callback; }

    #enabled = false;
    get enabled() { return this.#enabled; }

    set enabled(value) {

        if (value == true && this.enabled != true) {
            this.#enabled = true;

            Events.RaiseEvent(Events.List.ResearchEnabled, this);

            // TODO: if this is the first enabled, also enable research menu
            // (but not really, for a tech demo. empty research menu is fine)

            new MenuItem({
                menu: Research.#UI_MENU_RESEARCH,
                name: this.name,
                cost: this.cost,
                context: {
                    research: this
                }
            });
        }
    }

    constructor(options: ResearchOptions & { name: string }) {
        super(options);

        this.#cost = options.cost || 0;
        this.#callback = options.callback;
    }
}

declare global {
    interface Window {
        Research: typeof Research;
    }
}

if (window) window.Research = Research;
