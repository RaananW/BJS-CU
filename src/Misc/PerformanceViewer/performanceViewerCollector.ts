import { Scene } from "../../scene";
import { IPerfDatasets, IPerfDataSliceSnapshot, IPerfMetadata } from "../interfaces/iPerfViewer";
import { EventState, Observable } from "../observable";
import { PrecisionDate } from "../precisionDate";
import { DynamicFloat32Array } from "./dynamicFloat32Array";
import { IPerfViewerCollectionStrategy, PerfStrategyInitialization } from "./performanceViewerCollectionStrategies";

// the initial size of our array, should be a multiple of two!
const initialArraySize = 1800;

// three octets in a hexcode. #[AA][BB][CC], i.e. 24 bits of data.
const numberOfBitsInHexcode = 24;

// Allows single numeral hex numbers to be appended by a 0.
const hexPadding = "0";

// The offset for the value of the number of points inside a slice.
export const numberOfPointsOffset = 1;

// The offset for when actual data values start appearing inside a slice.
export const sliceDataOffset = 2;
/**
 * The collector class handles the collection and storage of data into the appropriate array.
 * The collector also handles notifying any observers of any updates.
 */
export class PerformanceViewerCollector {
    private _datasetMeta: Map<string, IPerfMetadata>;
    private _strategies: Map<string, IPerfViewerCollectionStrategy>;
    private _startingTimestamp: number;

    public readonly datasets: IPerfDatasets;
    public readonly datasetObservable: Observable<IPerfDataSliceSnapshot>;
    public readonly metadataObservable: Observable<Map<string, IPerfMetadata>>;

    /**
     * Handles the creation of a performance viewer collector.
     * @param _scene the scene to collect on.
     * @param _enabledStrategyCallbacks the list of data to collect with callbacks for initialization purposes.
     */
    constructor(private _scene: Scene, private _enabledStrategyCallbacks: PerfStrategyInitialization[]) {
        this.datasets = {
            ids: [],
            data: new DynamicFloat32Array(initialArraySize),
            startingIndices: new DynamicFloat32Array(initialArraySize)
        };
        this._strategies = new Map<string, IPerfViewerCollectionStrategy>();
        this._datasetMeta = new Map<string, IPerfMetadata>();
        this.datasetObservable = new Observable();
        this.metadataObservable = new Observable((observer) => observer.callback(this._datasetMeta, new EventState(0)));
        this._initialize();
    }

    /**
     * Populates our internal structures and does appropriate initialization of strategies.
     */
    private _initialize() {
        for (const strategyCallback of this._enabledStrategyCallbacks) {
            const strategy = strategyCallback(this._scene);

            this.datasets.ids.push(strategy.id);

            this._datasetMeta.set(strategy.id, {
                color: this._getHexFromId(strategy.id),
            });

            this._strategies.set(strategy.id, strategy);
        }

        this.metadataObservable.notifyObservers(this._datasetMeta);
    }

    /**
     * Gets a 6 character hexcode from a passed in string.
     * @param id the string to get a hex code for.
     * @returns a hexcode hashed from the id.
     */
    private _getHexFromId(id: string) {
        // this first bit is just a known way of hashing a string.
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            // (hash << 5) - hash is the same as hash * 31
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }

        // then we build the string octet by octet.
        let hex = "#";
        for (let i = 0; i < numberOfBitsInHexcode; i += 8) {
            const octet = (hash >> i) & 0xFF;
            hex += (hexPadding + octet.toString(16)).substr(-2);
        }

        return hex;
    }

    /**
     * Collects data for every dataset by using the appropriate strategy. This is called every frame.
     * This method will then notify all observers with the latest slice.
     */
    private _collectDataAtFrame = () => {
        const timestamp = PrecisionDate.Now - this._startingTimestamp;
        const numPoints = this.datasets.ids.length;

        // add the starting index for the slice
        const numberOfIndices = this.datasets.startingIndices.itemLength;
        let startingIndex = 0;

        if (numberOfIndices > 0) {
            const previousStartingIndex = this.datasets.startingIndices.at(numberOfIndices - 1);
            startingIndex = previousStartingIndex + this.datasets.data.at(previousStartingIndex + numberOfPointsOffset) + sliceDataOffset;
        }

        this.datasets.startingIndices.push(startingIndex);

        // add the first 2 items in our slice.
        this.datasets.data.push(timestamp);
        this.datasets.data.push(numPoints);

        // add the values inside the slice.
        this.datasets.ids.forEach((id: string) => {
            const strategy = this._strategies.get(id);

            if (!strategy) {
                return;
            }

            this.datasets.data.push(strategy.getData());
        });

        if (this.datasetObservable.hasObservers()) {
            const slice: number[] = [timestamp, numPoints];

            for (let i = 0; i < numPoints; i++) {
                slice.push(this.datasets.data.at(startingIndex + sliceDataOffset + i));
            }

            this.datasetObservable.notifyObservers({slice});
        }
    }

    /**
     * Collects data for every dataset by using the appropriate strategy when the user wants.
     * This method will then notify all observers with the latest slice of data.
     */
    public collectDataNow() {
        const timestamp = PrecisionDate.Now - this._startingTimestamp;
        const numPoints = this.datasets.ids.length;
        const slice: number[] = [timestamp, numPoints];

        // add the values inside the slice.
        this.datasets.ids.forEach((id: string) => {
            const strategy = this._strategies.get(id);

            if (!strategy) {
                return;
            }

            if (this.datasetObservable.hasObservers()) {
                slice.push(strategy.getData());
            }
        });

        if (this.datasetObservable.hasObservers()) {
            this.datasetObservable.notifyObservers({slice});
        }

    }

    /**
     * Updates a property for a dataset's metadata with the value provided.
     * @param id the id of the dataset which needs its metadata updated.
     * @param prop the property to update.
     * @param value the value to update the property with.
     * @returns
     */
    public updateMetadata<T extends keyof IPerfMetadata>(id: string, prop: T, value: IPerfMetadata[T]) {
        const meta = this._datasetMeta.get(id);

        if (!meta) {
            return;
        }

        meta[prop] = value;

        this.metadataObservable.notifyObservers(this._datasetMeta);
    }

    /**
     * Starts the realtime collection of data.
     */
    public start() {
        this._startingTimestamp = PrecisionDate.Now;
        this._scene.onBeforeRenderObservable.add(this._collectDataAtFrame);
    }

    /**
     * Stops the collection of data.
     */
    public stop() {
        this._scene.onBeforeRenderObservable.removeCallback(this._collectDataAtFrame);
    }
}