import Rectangle from "../../baseTypes/rectangle";
import RenderContext from "../RenderContext";
import Renderer, { RenderMethodConstructorOptions } from "../renderer";

type RenderMethod = (context: CanvasRenderingContext2D) => void;

export default class CanvasRenderingContext extends RenderContext {

    private _canvasElement: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;

    get context() { return this._context; }

    constructor() {
        super();

        this._canvasElement = document.createElement('canvas');
        this.styleCanvasElement();
        document.body.appendChild(this._canvasElement);
        this._context = this._canvasElement.getContext('2d');
    }

    private styleCanvasElement() {
        this._canvasElement.style.position = 'absolute';
        this._canvasElement.style.top = '0';
        this._canvasElement.style.left = '0';
        this._canvasElement.style.margin = '0';
        this._canvasElement.style.padding = '0';
        // TODO: hook resize
        this._canvasElement.width = window.innerWidth;
        this._canvasElement.height = window.innerHeight;
        // this._canvasElement.style.width = '100%';
        // this._canvasElement.style.height = '100%';
    }

    static RegisterRenderMethod(priority: number, method: RenderMethod, options?: RenderMethodConstructorOptions): void {
        options = {
            context: options?.context || 'CanvasRenderingContext'
        };
        Renderer.RegisterRenderMethod(priority, method, options);
    }

    Render(screenRect: Rectangle, renderMethods: RenderMethod[]): void {

        this._context.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
        
        for(var index in renderMethods) {
            var renderMethod = renderMethods[index];
            try {
                renderMethod(this._context);
            } catch(ex) {
                console.error(ex);
            }
        }
    }
}

// we can statically define (probably IN static methods, rather than the file)
// various alternative canvas renderers, especially for things like "offscreen" that are tools for the main
