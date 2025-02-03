import Point from "../coordinates/point";
import Seed from "../core/seed";
import { CharacterUtils } from "../entities/character/CharacterUtils";
import { EntityEvent } from "../entities/character/Entity";
import Events from "../events";
import TerrainGenerator, { TerrainGenerationOptions } from "./TerrainGenerator";
import Biome, { BiomeType } from "./biome";
import Chunk, { ChunkOptions } from "./chunk";

// TODO: test this at very low numbers so that we can know what happens when we approach it (and deal with that)
const CHUNK_SOFT_LIMIT = 5000;

export default class GameMap {

    private static _instance: GameMap;
    static get Instance() {
        return this._instance;
    };

    static {
        Events.Subscribe(Events.List.ChunkCreated, this.onChunkCreated.bind(this));
    }

    private static onChunkCreated(chunk: Chunk, eventOptions: any) {

        // TODO: This needs to be tested (console log fires when in 2p)
        if(eventOptions.isNetworkOriginEvent == false) return;
        console.log(`new chunk came from outside the house`);

        // TODO:
        // if it's in conflict with a chunk we have, raise an alarm
        // otherwise, add to the current(?) map
    }

    private _chunks: Record<string, Chunk> = {};
    private _biomes: Biome[] = [];
    private _seed;

    get chunks() { return this._chunks; }

    get Seed() { return this._seed; }

    // TODO: proper implementation (based on difficulty at generation time)
    get size() { return 100; }

    constructor(seed: Seed) {

        if((seed instanceof Seed) == false) {
            const message = `Cannot construct map without seed.`;
            console.error(message);
            debugger;
            throw message;
        }

        if(GameMap._instance == null) {
            GameMap._instance = this;
            // window.map = this;
        }

        this._seed = new Seed(seed.Random());
        
        Events.Subscribe(Events.List.EntityCreated, this.onCharacterCreated.bind(this));
        Events.Subscribe(Events.List.PlayerChunkChanged, this.onPlayerChunkChanged.bind(this));
    }

    // TODO: Allow differint starting points to be passed in
    // should we have an option about whether to include the originating chunk?
    GetNearbyChunks(
        startingChunk: Chunk,
        distance: number = 2)
        : Chunk[] {

        if(startingChunk == null) return [];
        distance = Math.abs(distance);

        const nearbyChunks: Chunk[] = [];
        for(var deltaX = distance * -1; deltaX <= distance; deltaX++) {
            for(var deltaY = distance * -1; deltaY <= distance; deltaY++) {
                if(deltaX == 0 && deltaY == 0) continue;
                const chunkCoordinate = new Point(
                    startingChunk.x + deltaX,
                    startingChunk.y + deltaY
                );
                const chunk = this.getChunkFromCoordinate(chunkCoordinate);
                if(chunk && nearbyChunks.indexOf(chunk) == -1) {
                    nearbyChunks.push(chunk);
                }
            }
        }

        // console.log(`${nearbyChunks.length} chunks within ${distance} of chunk at ${startingChunk.coordinate}`);
        return nearbyChunks;
    }

    private onCharacterCreated(event: EntityEvent) {

        if(event?.entity 
            && event?.entity.equals(CharacterUtils.GetLocalPlayer())) {
            const toChunk = event.entity.position.chunk;
            this.onPlayerChunkChanged({
                from: toChunk,
                to: toChunk
            })
        }
    }

    private onPlayerChunkChanged(event: { from: Chunk, to: Chunk }) {

        const chunksNearFrom = this.GetNearbyChunks(event.from);
        const chunksNearTo = this.GetNearbyChunks(event.to);
        chunksNearFrom.forEach(chunk => {

            // console.log(`Chunk at ${chunk.coordinate} active: ${chunk.active}`);
            if(chunk != event.to 
                && !chunksNearTo.includes(chunk)) {
                    chunk.active = false;
                }
        });
        chunksNearTo.forEach(chunk => {
            chunk.active = true;
        });
        event.to.active = true;
    }

    AddBiome(biome: Biome) {
        this._biomes.push(biome);
    }

    // this is not currently used
    GetBiome(point: Point) {

        for(var biome of this._biomes) {
            if(biome.contains(point)) {
                return biome;
            }
        }
        // TODO: determine BiomeType to use based on adjacent biomes
        // TODO: This breaks if grasslands is not defined, which is wrong design in more than a few ways
        const biomeType = BiomeType.Get("Grasslands");
        const width = Math.round(this.Seed.Random(biomeType.minWidth, biomeType.maxWidth));
        const height = Math.round(this.Seed.Random(biomeType.minHeight, biomeType.maxHeight));
        return new Biome({
            biomeType,
            width,
            height,
            x: point.x,
            y: point.y
        });
    }
    
    GetChunk(point: Point): Chunk {
        const chunkCoordinate = Chunk.getChunkCoordinate(point);
        return this.getChunkFromCoordinate(chunkCoordinate);
    }

    private getChunkFromCoordinate(point: Point) {
        // TODO: ensure X an Y are not point coordinates ...

        const coordinate = point.toString();
        if(this.shouldMakeNewChunk(coordinate)) {
            const active = Object.keys(this._chunks).length == 0;
            const biome = this.GetBiome(point);
            const terrainGenerationOptions: TerrainGenerationOptions = {
                seed: this.Seed,
            }
            const tiles = TerrainGenerator.Generate(terrainGenerationOptions);
            const chunkOptions: ChunkOptions = {
                biome,
                active,
                gameMap: this,
                x: point.x,
                y: point.y,
                tiles
            }
            new Chunk(chunkOptions);
        }
        return this._chunks[coordinate];
    }

    private shouldMakeNewChunk(coordinate: string) {

        if(CHUNK_SOFT_LIMIT < Object.keys(this._chunks).length) {
            console.warn(`Chunk limit reached (${Object.keys(this._chunks).length})`);
        };
        
        // if(Events.Context?.character?.isPlayer) ...
        return (!(coordinate in this._chunks))
            && CHUNK_SOFT_LIMIT > Object.keys(this._chunks).length;
            // && (character?.isPlayer || coordinate == "0,0");
            // && (Events.Context?.character?.isPlayer || coordinate == "0,0");
    }

    AddChunk(chunk: Chunk) {

        this._chunks[chunk.coordinate] = chunk;
    }
}
