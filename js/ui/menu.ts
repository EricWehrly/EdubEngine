import UIElement, { UIElementOptions } from './ui-element';
import Events from '../events';
import Action from '../action';
import MenuItem from './MenuItem';

Events.List.MenuOpened = "MenuOpened";
Events.List.MenuClosed = "MenuClosed";

export interface MenuOptions {
    name?: string;
    vertical?: boolean;
    menuAction?: (arg: MenuAction) => void;
    canBeClosed?: boolean;
    icon?: UIElementOptions;
}

export interface MenuAction {
    menu: Menu;
}

export default class Menu extends UIElement {
    
    private static _isAnyMenuOpen = false;
    // Menu class should "be" (extend) Listed, but can't extend 2, so...
    private static _MENU_LIST: Map<String, Menu> = new Map();
    canBeClosed: any;
    static get MENU_LIST() { return Menu._MENU_LIST; }

    private static _current: Menu = null;
    static get Current() { return Menu._current; }

    static Get(name: string) {
        return Menu._MENU_LIST.get(name.toLowerCase());
    }

    private static addMenu(menu: Menu) {
        
        Menu._MENU_LIST.set(menu.name.toLowerCase(), menu);
    }

    static get anyOpen() {

        return Menu._isAnyMenuOpen;
    }

    private static _computeAnyMenuOpen() {

        let visibleMenus = Array.from(Menu._MENU_LIST.values());
        visibleMenus = visibleMenus.filter(x => x.visible && x.collapsed != true);
        Menu._isAnyMenuOpen = visibleMenus.length > 0;
    }

    private _name;
    private _items: MenuItem[] = [];
    private _selected: MenuItem;
    private _menuAction;
    private _icon: UIElement;
    private _sections = new Map<string, UIElement>();

    get name() { return this._name; }
    get selected() { return this._selected; }
    get menuAction() { return this._menuAction; }
    get visible() { return super.visible; }
    get items() { return this._items; }
    get sections() { return this._sections; }

    // when I become visibile, I want to enable "menu_interact" from Action
    set visible(value) {
        super.visible = value;
        Action.List["menu_interact"].enabled = super.visible;

        Menu._computeAnyMenuOpen();

        if(this.visible) {
            Menu._current = this;
            Events.RaiseEvent(Events.List.MenuOpened, this);
        }
        else {
            if(Menu._current == this) Menu._current = null;
            Events.RaiseEvent(Events.List.MenuClosed, this);
        }
    }

    // TODO: when the menu is open / visible, need to enable
    // BUILD_ACTION
    // and disable when we lose visible / focus

    // raise events when visible changes, and subscribe to those?

    select(menuItem: MenuItem) {

        if(this._selected == menuItem) return;
        if(this._selected) this._selected.removeClass("selected");
        this._selected = menuItem;
        menuItem.addClass("selected");
    }

    selectNext() {

        if(this._items.length < 2) return;

        const selectedIndex = this._items.findIndex(item => item === this.selected);
        if(this._items.length - 1 > selectedIndex) {
            this.select(this._items[selectedIndex + 1]);
        } else {
            this.select(this._items[0]);
        }
    }

    selectPrevious() {

        if(this._items.length < 2) return;

        const selectedIndex = this._items.indexOf(this.selected);
        if(selectedIndex - 1 > -1) {
            this.select(this._items[selectedIndex - 1]);
        } else {
            this.select(this._items[this._items.length - 1]);
        }
    }

    constructor(options: MenuOptions & UIElementOptions = {}) {

        options.title = options.name;
        options.visible = options.visible || false;     // new menus are hidden by default, unlike ui elements

        super(options);

        this.addClass("menu");

        if(options.vertical) this.addClass("vertical");

        if(options.name) {
            this._name = options.name;
            this.addClass(options.name);
        }

        if(options.menuAction) this._menuAction = options.menuAction;

        if(options.icon) {
            this._icon = new UIElement(options.icon);
            this._icon.addClasses(["icon", this.name]);
            this._icon.customAction = this.toggle.bind(this);
        }

        if(options.canBeClosed == true || options.canBeClosed == undefined) this.canBeClosed = true;

        Menu.addMenu(this);
    }

    toggleCollapsed() {

        super.toggleCollapsed();
        Menu._computeAnyMenuOpen();
    }

    addItem(menuItem: MenuItem) {
        
        if(!this._selected) {
            this.select(menuItem);
        }

        this._items.push(menuItem);
    }

    removeItem(item: MenuItem) {

        item.destroy();
        const index = this._items.indexOf(item);
        if(index > -1) {
            this._items.splice(index, 1);
        }
    }

    getSection(name: string): UIElement {

        if(!this._sections.has(name)) {
            this._sections.set(name, this.addSection(name));
        }
        return this._sections.get(name);
    }

    // TODO: section header
    addSection(name: string): UIElement {
        
        const section = new UIElement({
            classes: ["section", name],
            parent: this,
            title: name
        });

        return section;
    }

    open() {
        this.visible = true;
    }

    close() {
        this.visible = false;
    }

    toggle() {
        console.log('togle');
        this.visible = !this.visible;
    }
}

declare global {
    interface Window {
        Menu: typeof Menu;
    }
}

if (window) window.Menu = Menu;
