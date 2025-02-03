import Events, { GameEvent } from "../events";

type TimingSegment = { 
    start?: number; 
    end?: number; 
    time?: number;  // essentially cache the elapsed time for the segment, since that's the information we're mostly going to want to use
};

export type SegmentOptions = {
    name: string;
    type: string;
    keepTime?: number;
    keepCount?: number;
    slowThreshold?: number;
}

class SegmentCollection {
    segments: TimingSegment[] = [];
    readonly options: SegmentOptions;
    get name() { return this.options.name; }
    get type() { return this.options.type; }

    // if options.keepCount
    // use these vars to track 'state'
    // (should we have a boolean that chooses if this is on?)
    firstSegmentTimestamp: number;

    get min() {
        if(this.segments.length == 0) return null;
        return this.segments.reduce((min, segment) => segment.time < min ? segment.time : min, this.segments[0].time);
    }

    get max() {
        if(this.segments.length == 0) return null;
        return this.segments.reduce((max, segment) => segment.time > max ? segment.time : max, this.segments[0].time);
    }

    get median() {
        if(this.segments.length == 0) return null;
        return this.segments.reduce((sum, segment) => sum + segment.time, 0) / this.segments.length;
    }

    get sum() {
        return this.segments.reduce((sum, segment) => sum + segment.time, 0);
    }

    get count() {
        return this.segments.length;
    }

    constructor(options: SegmentOptions) {
        this.options = options;
    }
}

export interface TimingEvent extends GameEvent {
    segmentType: string;
}

Events.List.NewSegmentType = 'NewSegmentType';

export default class Timing {

    static Segments: Record<string, SegmentCollection> = {};
    static Enabled: boolean = true;

    static get SegmentTypes() {
        const types: string[] = [];

        for(var segment of Object.values(Timing.Segments)) {
            types.push(segment.options.type);
        }

        return types;
    }

    static TimeFunction<T extends (...args: any[]) => any>(func: T, options: SegmentOptions): T {

        if(!Timing.Enabled) return func;

        if(!func.name) throw new Error('Timing: TimeFunction requires a named function');
        if(!options.name) options.name = func.name;
        return ((...args: Parameters<T>): ReturnType<T> => {
            Timing.StartSegment(options.name, options);
            const result = func(...args);
            Timing.EndSegment(options.name);
            return result;
        }) as T;
    }

    static StartSegment(name: string, options: SegmentOptions) {
        if (!Timing.Enabled) return;

        const segmentCollection = Timing._getSegmentCollection(name, options);
        segmentCollection.segments.push({
            start: Timing._getCurrentTime()
        });
    }

    static SegmentsByType(segmentType: string) {
        return Object.values(Timing.Segments)
            .filter(segment => segment.type == segmentType);
    }

    private static _getSegmentCollection(name: string, options: SegmentOptions): SegmentCollection {

        if(!Timing.SegmentTypes.includes(options.type)) {
            const newSegmentEvent: TimingEvent = { segmentType: options.type };
            Events.RaiseEvent(Events.List.NewSegmentType, newSegmentEvent);
        }

        if(!Timing.Segments.hasOwnProperty(name)) {
            Timing.Segments[name] = new SegmentCollection(options);
        }

        return Timing.Segments[name];
    }
    
    // ends the last segment, rather than a specific one
    static EndSegment = function(name: string) {

        if(!Timing.Enabled) return;

        const segmentCollection = Timing.Segments[name];
        const { keepCount, keepTime, slowThreshold } = segmentCollection.options;
        const segments = segmentCollection.segments;
        const index = segmentCollection.segments.length - 1;
        const segment = segments[index];
        segment.end = Timing._getCurrentTime();
        segment.time = Timing._formatTime(segment.end - segment.start);

        if(keepCount && segments.length > keepCount) {
            segments.splice(0, 1);
        }

        if(keepTime) {
            if(!segmentCollection.firstSegmentTimestamp) {
                segmentCollection.firstSegmentTimestamp = segment.start;
            } else {
                if(performance.now() - segmentCollection.firstSegmentTimestamp > keepTime) {
                    segmentCollection.segments = [];
                    segmentCollection.firstSegmentTimestamp = null;
                }
            }
        }

        if(slowThreshold && segment.time < slowThreshold) {
            segments.splice(index, 1);
        }
    }

    static ClearSegments(segmentType: string) {
        Timing.SegmentsByType(segmentType).forEach(segmentCollection => {
            segmentCollection.segments = [];
        });
    }

    private static _getCurrentTime() {
        // use lower precision timestamps, which are easier for human eyes to scan through
        return Timing._formatTime(performance.now());
    }

    private static _formatTime(time: number) {
        return parseFloat(time.toFixed(2));
    }
}

declare global {
    interface Window {
        Timing: typeof Timing;
    }
}

if (window) window.Timing = Timing;
