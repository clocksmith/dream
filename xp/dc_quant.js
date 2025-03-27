/**
 * @file dc_quant.js
 * @module dc_quant
 * @description
 * This file implements color quantization algorithms for the dynamic color library,
 * including Wu and WSMeans quantizers, and supporting utility classes.
 * @requires module:dc_core
 */

import { colorUtils } from './dc_core.js';

/**
 * @typedef {object} DistanceAndIndex
 * @property {number} distance - Distance between colors
 * @property {number} index - Index of the color
 */

/**
 * @typedef {object} PointProvider
 * @property {function(number[]): number} toInt - Converts a point to an integer
 * @property {function(number): number[]} fromInt - Converts an integer to a point
 * @property {function(number[], number[]): number} distance - Calculates distance between points
 */

/**
 * @typedef {object} Box
 * @property {number} r0 - Minimum red value
 * @property {number} r1 - Maximum red value
 * @property {number} g0 - Minimum green value
 * @property {number} g1 - Maximum green value
 * @property {number} b0 - Minimum blue value
 * @property {number} b1 - Maximum blue value
 * @property {number} vol - Volume of the box
 */

/**
 * @typedef {object} CreateBoxesResult
 * @property {number} requestedCount - Number of colors requested
 * @property {number} resultCount - Number of colors found
 */

/**
 * @typedef {object} MaximizeResult
 * @property {number} cutLocation - Location of the cut
 * @property {number} maximum - Maximum value
 */

// Constants
const MAX_ITERATIONS = 10;
const MIN_MOVEMENT_DISTANCE = 3.0;
const INDEX_BITS = 5;
const SIDE_LENGTH = 33;
const TOTAL_SIZE = 35937;

/**
 * Direction constants for Wu quantizer
 */
const directions = {
    RED: 'red',
    GREEN: 'green',
    BLUE: 'blue'
};

/**
 * Implementation of the Celebi quantizer algorithm.
 *
 * This is a wrapper around Wu and Wsmeans quantizers.
 */
class QuantizerCelebi {
    /**
     * Quantizes an array of pixels using a two-stage approach:
     * 1. Wu quantizer for initial clusters
     * 2. Wsmeans for refinement
     *
     * @param {number[]} pixels - Colors in ARGB format
     * @param {number} maxColors - The number of colors to quantize to
     * @return {Map<number, number>} - Map of ARGB colors to pixel count
     */
    static quantize(pixels, maxColors) {
        // First stage: Wu quantizer for initial clustering
        const wu = new QuantizerWu();
        const wuResult = wu.quantize(pixels, maxColors);

        // Second stage: Wsmeans for refinement
        return QuantizerWsmeans.quantize(pixels, wuResult, maxColors);
    }
}

/**
 * Implementation of the Weighted Square Means (WSMeans) quantization algorithm.
 */
class QuantizerWsmeans {
    /**
     * Quantizes an array of pixels using weighted square means algorithm.
     *
     * @param {number[]} inputPixels - Colors in ARGB format
     * @param {number[]} startingClusters - Initial cluster colors in ARGB format
     * @param {number} maxColors - The number of colors to quantize to
     * @return {Map<number, number>} - Map of ARGB colors to pixel count
     */
    static quantize(inputPixels, startingClusters, maxColors) {
        // Count pixel occurrences and create point representations
        const pixelToCount = new Map();
        const points = [];
        const pixels = [];
        const pointProvider = new LabPointProvider();

        for (const inputPixel of inputPixels) {
            if (!pixelToCount.has(inputPixel)) {
                points.push(pointProvider.fromInt(inputPixel));
                pixels.push(inputPixel);
                pixelToCount.set(inputPixel, 1);
            } else {
                pixelToCount.set(inputPixel, pixelToCount.get(inputPixel) + 1);
            }
        }

        // Create array of pixel counts
        const counts = pixels.map(pixel => pixelToCount.get(pixel));

        // Determine number of clusters to use
        let clusterCount = Math.min(maxColors, points.length);
        if (startingClusters.length > 0) {
            clusterCount = Math.min(clusterCount, startingClusters.length);
        }

        // Initialize clusters
        const clusters = startingClusters.map(cluster => pointProvider.fromInt(cluster));


        // Add additional random clusters if needed
        const additionalClustersNeeded = clusterCount - clusters.length;
        if (startingClusters.length === 0 && additionalClustersNeeded > 0) {
            for (let i = 0; i < additionalClustersNeeded; i++) {
                clusters.push([
                    Math.random() * 100.0,
                    Math.random() * 200 - 100,
                    Math.random() * 200 - 100
                ]);
            }
        }

        // Initialize cluster assignments randomly
        const clusterIndices = points.map(() => Math.floor(Math.random() * clusterCount));

        // Initialize matrices for distance calculations
        const indexMatrix = Array.from({ length: clusterCount }, () => Array(clusterCount).fill(0));
        const distanceToIndexMatrix = Array.from({ length: clusterCount }, () =>
            Array.from({ length: clusterCount }, () => new DistanceAndIndex())
        );

        // Array to store pixel count sums for each cluster
        const pixelCountSums = Array(clusterCount).fill(0);

        // Main iteration loop
        for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
            // Calculate distances between all clusters
            for (let i = 0; i < clusterCount; i++) {
                for (let j = i + 1; j < clusterCount; j++) {
                    const distance = pointProvider.distance(clusters[i], clusters[j]);

                    distanceToIndexMatrix[j][i].distance = distance;
                    distanceToIndexMatrix[j][i].index = i;

                    distanceToIndexMatrix[i][j].distance = distance;
                    distanceToIndexMatrix[i][j].index = j;
                }

                // Sort distances for each cluster
                distanceToIndexMatrix[i].sort((a, b) => a.distance - b.distance);

                // Create index mapping for fast lookups
                for (let j = 0; j < clusterCount; j++) {
                    indexMatrix[i][j] = distanceToIndexMatrix[i][j].index;
                }
            }

            // Move points between clusters
            let pointsMoved = 0;
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                const previousClusterIndex = clusterIndices[i];
                const previousCluster = clusters[previousClusterIndex];
                const previousDistance = pointProvider.distance(point, previousCluster);

                // Start with current distance as minimum
                let minimumDistance = previousDistance;
                let newClusterIndex = -1;

                // Check other clusters for possibly better fit
                for (let j = 0; j < clusterCount; j++) {
                    // Skip clusters that are very far away from the previous cluster
                    if (distanceToIndexMatrix[previousClusterIndex][j].distance >= 4 * previousDistance) {
                        continue;
                    }

                    const distance = pointProvider.distance(point, clusters[j]);
                    if (distance < minimumDistance) {
                        minimumDistance = distance;
                        newClusterIndex = j;
                    }
                }

                // Move point if significantly better cluster found
                if (newClusterIndex !== -1) {
                    if (Math.abs((Math.sqrt(minimumDistance) - Math.sqrt(previousDistance))) > MIN_MOVEMENT_DISTANCE) {
                        pointsMoved++;
                        clusterIndices[i] = newClusterIndex;
                    }
                }
            }

            // If no points moved and not first iteration, we're done
            if (pointsMoved === 0 && iteration !== 0) {
                break;
            }

            // Recalculate cluster centers
            const componentASums = Array(clusterCount).fill(0);
            const componentBSums = Array(clusterCount).fill(0);
            const componentCSums = Array(clusterCount).fill(0);

            pixelCountSums.fill(0);

            // Sum up points in each cluster
            for (let i = 0; i < points.length; i++) {
                const clusterIndex = clusterIndices[i];
                const point = points[i];
                const count = counts[i];

                pixelCountSums[clusterIndex] += count;
                componentASums[clusterIndex] += (point[0] * count);
                componentBSums[clusterIndex] += (point[1] * count);
                componentCSums[clusterIndex] += (point[2] * count);
            }

            // Calculate new cluster centers
            for (let i = 0; i < clusterCount; i++) {
                const count = pixelCountSums[i];

                if (count === 0) {
                    clusters[i] = [0.0, 0.0, 0.0];
                    continue;
                }

                clusters[i] = [
                    componentASums[i] / count,
                    componentBSums[i] / count,
                    componentCSums[i] / count
                ];
            }
        }

        // Create final mapping of colors to populations
        const argbToPopulation = new Map();
        for (let i = 0; i < clusterCount; i++) {
            const count = pixelCountSums[i];

            if (count === 0) continue;

            const possibleNewCluster = pointProvider.toInt(clusters[i]);

            // Skip duplicates
            if (argbToPopulation.has(possibleNewCluster)) continue;

            argbToPopulation.set(possibleNewCluster, count);
        }

        return argbToPopulation;
    }
}

/**
 * Helper class to store distance and index information.
 */
class DistanceAndIndex {
    constructor() {
        this.distance = -1;
        this.index = -1;
    }
}

/**
 * PointProvider implementation using the Lab color space.
 */
class LabPointProvider {
    /**
     * Converts an ARGB color to Lab representation.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number[]} - Lab representation of color
     */
    fromInt(argb) {
        return colorUtils.labFromArgb(argb);
    }

    /**
     * Converts Lab coordinates to ARGB color.
     *
     * @param {number[]} point - Lab coordinates
     * @return {number} - Color in ARGB format
     */
    toInt(point) {
        return colorUtils.argbFromLab(point[0], point[1], point[2]);
    }

    /**
     * Calculates the squared distance between two Lab colors.
     *
     * @param {number[]} from - First point in Lab coordinates
     * @param {number[]} to - Second point in Lab coordinates
     * @return {number} - Squared distance between the two points
     */
    distance(from, to) {
        const dL = from[0] - to[0];
        const dA = from[1] - to[1];
        const dB = from[2] - to[2];
        return dL * dL + dA * dA + dB * dB;
    }
}

/**
 * Simple quantizer that maps pixels to their exact colors.
 */
class QuantizerMap {
    /**
     * Maps an array of pixels to their frequency.
     *
     * @param {number[]} pixels - Colors in ARGB format
     * @return {Map<number, number>} - Map of ARGB colors to pixel count
     */
    static quantize(pixels) {
        const countByColor = new Map();

        for (const pixel of pixels) {
            // Skip transparent pixels
            if (colorUtils.alphaFromArgb(pixel) < 255) continue;

            countByColor.set(pixel, (countByColor.get(pixel) || 0) + 1);
        }

        return countByColor;
    }
}

/**
 * Implementation of Xiaolin Wu's color quantization algorithm.
 */
class QuantizerWu {
    constructor() {
        this.weights = [];
        this.momentsR = [];
        this.momentsG = [];
        this.momentsB = [];
        this.moments = [];
        this.cubes = [];
    }

    /**
     * Quantizes an array of pixels to a set of colors using Wu's algorithm.
     *
     * @param {number[]} pixels - Colors in ARGB format
     * @param {number} maxColors - The number of colors to quantize to
     * @return {number[]} - Colors in ARGB format
     */
    quantize(pixels, maxColors) {
        this.constructHistogram(pixels);
        this.computeMoments();
        const createBoxesResult = this.createBoxes(maxColors);
        const results = this.createResult(createBoxesResult.resultCount);
        return results;
    }

    /**
     * Constructs a histogram of the pixels.
     *
     * @param {number[]} pixels - Colors in ARGB format
     */
    constructHistogram(pixels) {
        // Initialize arrays
        this.weights = Array(TOTAL_SIZE).fill(0);
        this.momentsR = Array(TOTAL_SIZE).fill(0);
        this.momentsG = Array(TOTAL_SIZE).fill(0);
        this.momentsB = Array(TOTAL_SIZE).fill(0);
        this.moments = Array(TOTAL_SIZE).fill(0);

        // Get color counts
        const countByColor = QuantizerMap.quantize(pixels);

        // Fill histogram
        for (const [pixel, count] of countByColor.entries()) {
            const r = colorUtils.redFromArgb(pixel);
            const g = colorUtils.greenFromArgb(pixel);
            const b = colorUtils.blueFromArgb(pixel);

            // Quantize to fewer bits per component
            const bitsToRemove = 8 - INDEX_BITS;
            const iR = (r >> bitsToRemove) + 1;
            const iG = (g >> bitsToRemove) + 1;
            const iB = (b >> bitsToRemove) + 1;

            const index = this.getIndex(iR, iG, iB);

            this.weights[index] = (this.weights[index] || 0) + count;
            this.momentsR[index] += count * r;
            this.momentsG[index] += count * g;
            this.momentsB[index] += count * b;
            this.moments[index] += count * (r * r + g * g + b * b);
        }
    }

    /**
     * Computes moments from the histogram.
     */
    computeMoments() {
        for (let r = 1; r < SIDE_LENGTH; r++) {
            const area = Array(SIDE_LENGTH).fill(0);
            const areaR = Array(SIDE_LENGTH).fill(0);
            const areaG = Array(SIDE_LENGTH).fill(0);
            const areaB = Array(SIDE_LENGTH).fill(0);
            const area2 = Array(SIDE_LENGTH).fill(0.0);

            for (let g = 1; g < SIDE_LENGTH; g++) {
                let line = 0;
                let lineR = 0;
                let lineG = 0;
                let lineB = 0;
                let line2 = 0.0;

                for (let b = 1; b < SIDE_LENGTH; b++) {
                    const index = this.getIndex(r, g, b);

                    line += this.weights[index];
                    lineR += this.momentsR[index];
                    lineG += this.momentsG[index];
                    lineB += this.momentsB[index];
                    line2 += this.moments[index];

                    area[b] += line;
                    areaR[b] += lineR;
                    areaG[b] += lineG;
                    areaB[b] += lineB;
                    area2[b] += line2;

                    const previousIndex = this.getIndex(r - 1, g, b);
                    this.weights[index] = this.weights[previousIndex] + area[b];
                    this.momentsR[index] = this.momentsR[previousIndex] + areaR[b];
                    this.momentsG[index] = this.momentsG[previousIndex] + areaG[b];
                    this.momentsB[index] = this.momentsB[previousIndex] + areaB[b];
                    this.moments[index] = this.moments[previousIndex] + area2[b];
                }
            }
        }
    }

    /**
     * Creates boxes (color clusters) by recursively dividing the color space.
     *
     * @param {number} maxColors - The number of colors to quantize to
     * @return {CreateBoxesResult} - Result of creating boxes
     */
    createBoxes(maxColors) {
        // Initialize boxes
        this.cubes = Array.from({ length: maxColors }, () => new Box());
        const volumeVariance = Array(maxColors).fill(0.0);

        // Set up the first box to cover the whole space
        this.cubes[0].r0 = 0;
        this.cubes[0].g0 = 0;
        this.cubes[0].b0 = 0;
        this.cubes[0].r1 = SIDE_LENGTH - 1;
        this.cubes[0].g1 = SIDE_LENGTH - 1;
        this.cubes[0].b1 = SIDE_LENGTH - 1;

        let generatedColorCount = maxColors;
        let next = 0;

        // Iteratively split boxes
        for (let i = 1; i < maxColors; i++) {
            if (this.cut(this.cubes[next], this.cubes[i])) {
                // Calculate variance for both new boxes
                volumeVariance[next] = this.cubes[next].vol > 1 ?
                    this.variance(this.cubes[next]) : 0.0;
                volumeVariance[i] = this.cubes[i].vol > 1 ?
                    this.variance(this.cubes[i]) : 0.0;
            } else {
                // Couldn't cut the box, mark as done
                volumeVariance[next] = 0.0;
                i--;
            }

            // Find the next box to split (the one with the highest variance)
            next = 0;
            let temp = volumeVariance[0];
            for (let j = 1; j <= i; j++) {
                if (volumeVariance[j] > temp) {
                    temp = volumeVariance[j];
                    next = j;
                }
            }

            // If no more boxes can be split, stop
            if (temp <= 0.0) {
                generatedColorCount = i + 1;
                break;
            }
        }

        return {
            requestedCount: maxColors,
            resultCount: generatedColorCount
        };
    }

    /**
     * Creates the final result colors from the boxes.
     *
     * @param {number} colorCount - Number of colors to create
     * @return {number[]} - Colors in ARGB format
     */
    createResult(colorCount) {
        const colors = [];

        for (let i = 0; i < colorCount; ++i) {
            const cube = this.cubes[i];
            const weight = this.volume(cube, this.weights);

            if (weight > 0) {
                const r = Math.round(this.volume(cube, this.momentsR) / weight);
                const g = Math.round(this.volume(cube, this.momentsG) / weight);
                const b = Math.round(this.volume(cube, this.momentsB) / weight);

                colors.push((255 << 24) | ((r & 0x0ff) << 16) | ((g & 0x0ff) << 8) | (b & 0x0ff));
            }
        }

        return colors;
    }

    /**
     * Calculates the color variance within a box.
     *
     * @param {Box} cube - Box to calculate variance for
     * @return {number} - Variance value
     */
    variance(cube) {
        const dr = this.volume(cube, this.momentsR);
        const dg = this.volume(cube, this.momentsG);
        const db = this.volume(cube, this.momentsB);

        // Calculate the variance using the moments
        const xx = this.moments[this.getIndex(cube.r1, cube.g1, cube.b1)]
            - this.moments[this.getIndex(cube.r1, cube.g1, cube.b0)]
            - this.moments[this.getIndex(cube.r1, cube.g0, cube.b1)]
            + this.moments[this.getIndex(cube.r1, cube.g0, cube.b0)]
            - this.moments[this.getIndex(cube.r0, cube.g1, cube.b1)]
            + this.moments[this.getIndex(cube.r0, cube.g1, cube.b0)]
            + this.moments[this.getIndex(cube.r0, cube.g0, cube.b1)]
            - this.moments[this.getIndex(cube.r0, cube.g0, cube.b0)];

        const hypotenuse = dr * dr + dg * dg + db * db;
        const volume = this.volume(cube, this.weights);

        return xx - hypotenuse / volume;
    }

    /**
     * Cuts a box into two boxes along the longest dimension.
     *
     * @param {Box} one - Box to cut
     * @param {Box} two - Box to store the second half
     * @return {boolean} - Whether the cut was successful
     */
    cut(one, two) {
        // Get moments for the entire box
        const wholeR = this.volume(one, this.momentsR);
        const wholeG = this.volume(one, this.momentsG);
        const wholeB = this.volume(one, this.momentsB);
        const wholeW = this.volume(one, this.weights);

        // Find the best cut for each dimension
        const maxRResult = this.maximize(one, directions.RED, one.r0 + 1, one.r1,
            wholeR, wholeG, wholeB, wholeW);
        const maxGResult = this.maximize(one, directions.GREEN, one.g0 + 1, one.g1,
            wholeR, wholeG, wholeB, wholeW);
        const maxBResult = this.maximize(one, directions.BLUE, one.b0 + 1, one.b1,
            wholeR, wholeG, wholeB, wholeW);

        // Determine which dimension to cut
        let direction;
        const maxR = maxRResult.maximum;
        const maxG = maxGResult.maximum;
        const maxB = maxBResult.maximum;

        if (maxR >= maxG && maxR >= maxB) {
            // Cut in red dimension
            if (maxRResult.cutLocation < 0) return false;
            direction = directions.RED;
        } else if (maxG >= maxR && maxG >= maxB) {
            // Cut in green dimension
            direction = directions.GREEN;
        } else {
            // Cut in blue dimension
            direction = directions.BLUE;
        }

        // Set up the second box to the upper half
        two.r1 = one.r1;
        two.g1 = one.g1;
        two.b1 = one.b1;

        // Perform the cut
        switch (direction) {
            case directions.RED:
                one.r1 = maxRResult.cutLocation;
                two.r0 = one.r1;
                two.g0 = one.g0;
                two.b0 = one.b0;
                break;

            case directions.GREEN:
                one.g1 = maxGResult.cutLocation;
                two.r0 = one.r0;
                two.g0 = one.g1;
                two.b0 = one.b0;
                break;

            case directions.BLUE:
                one.b1 = maxBResult.cutLocation;
                two.r0 = one.r0;
                two.g0 = one.g0;
                two.b0 = one.b1;
                break;

            default:
                throw new Error('unexpected direction ' + direction);
        }

        // Calculate the volumes of the two boxes
        one.vol = (one.r1 - one.r0) * (one.g1 - one.g0) * (one.b1 - one.b0);
        two.vol = (two.r1 - two.r0) * (two.g1 - two.g0) * (two.b1 - two.b0);

        return true;
    }

    /**
     * Finds the optimal place to cut a box along a given dimension.
     *
     * @param {Box} cube - Box to cut
     * @param {string} direction - Direction to cut (RED, GREEN, or BLUE)
     * @param {number} first - Starting position
     * @param {number} last - Ending position
     * @param {number} wholeR - Red moment for the whole box
     * @param {number} wholeG - Green moment for the whole box
     * @param {number} wholeB - Blue moment for the whole box
     * @param {number} wholeW - Weight for the whole box
     * @return {MaximizeResult} - Result with the cut location and maximum value
     */
    maximize(cube, direction, first, last, wholeR, wholeG, wholeB, wholeW) {
        // Get bottom moments
        const bottomR = this.bottom(cube, direction, this.momentsR);
        const bottomG = this.bottom(cube, direction, this.momentsG);
        const bottomB = this.bottom(cube, direction, this.momentsB);
        const bottomW = this.bottom(cube, direction, this.weights);

        let max = 0.0;
        let cut = -1;

        let halfR = 0;
        let halfG = 0;
        let halfB = 0;
        let halfW = 0;

        // Try each possible cut position
        for (let i = first; i < last; i++) {
            // Calculate moments for half the box
            halfR = bottomR + this.top(cube, direction, i, this.momentsR);
            halfG = bottomG + this.top(cube, direction, i, this.momentsG);
            halfB = bottomB + this.top(cube, direction, i, this.momentsB);
            halfW = bottomW + this.top(cube, direction, i, this.weights);

            // Skip if no weight in this half
            if (halfW === 0) continue;

            // Calculate variance for this half
            let tempNumerator = (halfR * halfR + halfG * halfG + halfB * halfB) * 1.0;
            let tempDenominator = halfW * 1.0;
            let temp = tempNumerator / tempDenominator;

            // Calculate for the other half
            halfR = wholeR - halfR;
            halfG = wholeG - halfG;
            halfB = wholeB - halfB;
            halfW = wholeW - halfW;

            // Skip if no weight in the other half
            if (halfW === 0) continue;

            // Add variance for the other half
            tempNumerator = (halfR * halfR + halfG * halfG + halfB * halfB) * 1.0;
            tempDenominator = halfW * 1.0;
            temp += tempNumerator / tempDenominator;

            // Update the maximum if this is better
            if (temp > max) {
                max = temp;
                cut = i;
            }
        }

        return { cutLocation: cut, maximum: max };
    }

    /**
     * Calculates the volume of a moment for a given box.
     *
     * @param {Box} cube - Box to calculate for
     * @param {number[]} moment - Moment array
     * @return {number} - Volume of the moment
     */
    volume(cube, moment) {
        return (
            moment[this.getIndex(cube.r1, cube.g1, cube.b1)] -
            moment[this.getIndex(cube.r1, cube.g1, cube.b0)] -
            moment[this.getIndex(cube.r1, cube.g0, cube.b1)] +
            moment[this.getIndex(cube.r1, cube.g0, cube.b0)] -
            moment[this.getIndex(cube.r0, cube.g1, cube.b1)] +
            moment[this.getIndex(cube.r0, cube.g1, cube.b0)] +
            moment[this.getIndex(cube.r0, cube.g0, cube.b1)] -
            moment[this.getIndex(cube.r0, cube.g0, cube.b0)]);
    }

    /**
     * Calculates the bottom slice of a given moment for a box.
     *
     * @param {Box} cube - Box to calculate for
     * @param {string} direction - Direction (RED, GREEN, or BLUE)
     * @param {number[]} moment - Moment array
     * @return {number} - Bottom slice volume
     */
    bottom(cube, direction, moment) {
        switch (direction) {
            case directions.RED:
                return (
                    -moment[this.getIndex(cube.r0, cube.g1, cube.b1)] +
                    moment[this.getIndex(cube.r0, cube.g1, cube.b0)] +
                    moment[this.getIndex(cube.r0, cube.g0, cube.b1)] -
                    moment[this.getIndex(cube.r0, cube.g0, cube.b0)]);

            case directions.GREEN:
                return (
                    -moment[this.getIndex(cube.r1, cube.g0, cube.b1)] +
                    moment[this.getIndex(cube.r1, cube.g0, cube.b0)] +
                    moment[this.getIndex(cube.r0, cube.g0, cube.b1)] -
                    moment[this.getIndex(cube.r0, cube.g0, cube.b0)]);

            case directions.BLUE:
                return (
                    -moment[this.getIndex(cube.r1, cube.g1, cube.b0)] +
                    moment[this.getIndex(cube.r1, cube.g0, cube.b0)] +
                    moment[this.getIndex(cube.r0, cube.g1, cube.b0)] -
                    moment[this.getIndex(cube.r0, cube.g0, cube.b0)]);

            default:
                throw new Error('unexpected direction ' + direction);
        }
    }

    /**
     * Calculates the top slice of a given moment for a box.
     *
     * @param {Box} cube - Box to calculate for
     * @param {string} direction - Direction (RED, GREEN, or BLUE)
     * @param {number} position - Position of the slice
     * @param {number[]} moment - Moment array
     * @return {number} - Top slice volume
     */
    top(cube, direction, position, moment) {
        switch (direction) {
            case directions.RED:
                return (
                    moment[this.getIndex(position, cube.g1, cube.b1)] -
                    moment[this.getIndex(position, cube.g1, cube.b0)] -
                    moment[this.getIndex(position, cube.g0, cube.b1)] +
                    moment[this.getIndex(position, cube.g0, cube.b0)]);

            case directions.GREEN:
                return (
                    moment[this.getIndex(cube.r1, position, cube.b1)] -
                    moment[this.getIndex(cube.r1, position, cube.b0)] -
                    moment[this.getIndex(cube.r0, position, cube.b1)] +
                    moment[this.getIndex(cube.r0, position, cube.b0)]);

            case directions.BLUE:
                return (
                    moment[this.getIndex(cube.r1, cube.g1, position)] -
                    moment[this.getIndex(cube.r1, cube.g0, position)] -
                    moment[this.getIndex(cube.r0, cube.g1, position)] +
                    moment[this.getIndex(cube.r0, cube.g0, position)]);

            default:
                throw new Error('unexpected direction ' + direction);
        }
    }

    /**
     * Calculates the index into the moment arrays for a given position.
     *
     * @param {number} r - Red position
     * @param {number} g - Green position
     * @param {number} b - Blue position
     * @return {number} - Index value
     */
    getIndex(r, g, b) {
        return (r << (INDEX_BITS * 2)) + (r << (INDEX_BITS + 1)) + r + (g << INDEX_BITS) + g + b;
    }
}

/**
 * Box in RGB space for the Wu quantizer.
 */
class Box {
    constructor() {
        this.r0 = 0;
        this.r1 = 0;
        this.g0 = 0;
        this.g1 = 0;
        this.b0 = 0;
        this.b1 = 0;
        this.vol = 0;
    }
}


// Export the classes
export {
    QuantizerCelebi,
    QuantizerWsmeans,
    DistanceAndIndex,
    LabPointProvider,
    QuantizerMap,
    QuantizerWu,
    Box,
    directions
};