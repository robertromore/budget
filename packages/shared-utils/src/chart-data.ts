/**
 * Generic chart data transformation utilities
 * These functions are reusable across any application domain
 */

/**
 * Generic chart data point interface
 */
export interface ChartDataPoint {
  x?: any;
  y?: any;
  name?: string;
  value?: number;
  color?: string;
  [key: string]: any;
}

/**
 * Generic data transformer with flexible mapping
 */
export function transformData<T extends Record<string, any>>(
  data: T[],
  mapping: {
    x: keyof T | ((item: T) => any);
    y: keyof T | ((item: T) => number);
    category?: keyof T | ((item: T) => string);
    series?: keyof T | ((item: T) => string);
    metadata?: (item: T, index: number) => any;
  }
): ChartDataPoint[] {
  const getField = <K>(field: keyof T | ((item: T) => K) | undefined, item: T, defaultValue?: K): K | undefined => {
    if (!field) return defaultValue;
    return typeof field === 'function' ? field(item) : item[field] as K;
  };

  return data.map((item, index) => {
    const point: ChartDataPoint = {
      x: getField(mapping.x, item)!,
      y: Number(getField(mapping.y, item)) || 0
    };

    // Add optional fields if provided
    const category = getField(mapping.category, item);
    if (category !== undefined) {
      point.category = String(category);
    }

    const series = getField(mapping.series, item);
    if (series !== undefined) {
      point.series = String(series);
    }

    // Add metadata
    if (mapping.metadata) {
      point.metadata = mapping.metadata(item, index);
    } else {
      point.metadata = { ...item, index };
    }

    return point;
  });
}

/**
 * Groups data points by a specified field
 */
export function groupDataBy<T extends ChartDataPoint>(
  data: T[],
  groupField: 'x' | 'category' | 'series',
  aggregation: 'sum' | 'average' | 'count' | 'min' | 'max' = 'sum'
): ChartDataPoint[] {
  const groups = new Map<any, T[]>();
  
  // Group data
  data.forEach(point => {
    const key = point[groupField];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(point);
  });
  
  // Aggregate groups
  return Array.from(groups.entries()).map(([key, points]) => {
    let y: number;
    
    switch (aggregation) {
      case 'sum':
        y = points.reduce((sum, p) => sum + p.y, 0);
        break;
      case 'average':
        y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        break;
      case 'count':
        y = points.length;
        break;
      case 'min':
        y = Math.min(...points.map(p => p.y));
        break;
      case 'max':
        y = Math.max(...points.map(p => p.y));
        break;
    }
    
    return {
      x: groupField === 'x' ? key : points[0].x,
      y,
      category: groupField === 'category' ? key : points[0].category,
      series: groupField === 'series' ? key : points[0].series,
      metadata: {
        group: key,
        count: points.length,
        aggregation,
        points
      }
    };
  });
}

/**
 * Sorts data points by a specified field
 */
export function sortData(
  data: ChartDataPoint[],
  field: 'x' | 'y' | 'category' | 'series' = 'x',
  order: 'asc' | 'desc' = 'asc'
): ChartDataPoint[] {
  const sorted = [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    
    if (aVal === undefined || bVal === undefined) return 0;
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

/**
 * Filters data points by value range
 */
export function filterByRange(
  data: ChartDataPoint[],
  field: 'x' | 'y',
  min?: number | Date,
  max?: number | Date
): ChartDataPoint[] {
  return data.filter(point => {
    const value = point[field];
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  });
}

/**
 * Calculates moving average for time series data
 */
export function calculateMovingAverage(
  data: ChartDataPoint[],
  windowSize: number = 7
): ChartDataPoint[] {
  return data.map((point, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(data.length, index + Math.ceil(windowSize / 2));
    const window = data.slice(start, end);
    const avg = window.reduce((sum, p) => sum + p.y, 0) / window.length;
    
    return {
      ...point,
      y: avg,
      metadata: {
        ...point.metadata,
        originalValue: point.y,
        movingAverage: avg,
        windowSize
      }
    };
  });
}

/**
 * Normalizes data to percentage (0-100)
 */
export function normalizeToPercentage(
  data: ChartDataPoint[],
  groupBy?: 'x' | 'category' | 'series'
): ChartDataPoint[] {
  if (!groupBy) {
    // Normalize entire dataset
    const total = data.reduce((sum, p) => sum + p.y, 0);
    if (total === 0) return data;
    
    return data.map(point => ({
      ...point,
      y: (point.y / total) * 100,
      metadata: {
        ...point.metadata,
        originalValue: point.y,
        percentage: (point.y / total) * 100
      }
    }));
  }
  
  // Normalize within groups
  const groups = new Map<any, number>();
  data.forEach(point => {
    const key = point[groupBy];
    groups.set(key, (groups.get(key) || 0) + point.y);
  });
  
  return data.map(point => {
    const groupTotal = groups.get(point[groupBy]) || 0;
    if (groupTotal === 0) return point;
    
    return {
      ...point,
      y: (point.y / groupTotal) * 100,
      metadata: {
        ...point.metadata,
        originalValue: point.y,
        percentage: (point.y / groupTotal) * 100,
        groupTotal
      }
    };
  });
}

/**
 * Fills gaps in time series data
 */
export function fillTimeSeriesGaps(
  data: ChartDataPoint[],
  interval: 'day' | 'week' | 'month',
  fillValue: number | 'interpolate' | 'previous' = 0
): ChartDataPoint[] {
  if (data.length < 2) return data;
  
  // Sort by x (assuming dates)
  const sorted = sortData(data, 'x', 'asc');
  const result: ChartDataPoint[] = [];
  
  for (let i = 0; i < sorted.length - 1; i++) {
    result.push(sorted[i]);
    
    const current = sorted[i].x as Date;
    const next = sorted[i + 1].x as Date;
    
    // Calculate expected interval in milliseconds
    let expectedInterval: number;
    switch (interval) {
      case 'day':
        expectedInterval = 24 * 60 * 60 * 1000;
        break;
      case 'week':
        expectedInterval = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        expectedInterval = 30 * 24 * 60 * 60 * 1000; // Approximate
        break;
    }
    
    const gap = next.getTime() - current.getTime();
    const missingPoints = Math.floor(gap / expectedInterval) - 1;
    
    // Fill missing points
    for (let j = 1; j <= missingPoints; j++) {
      const fillDate = new Date(current.getTime() + j * expectedInterval);
      let fillY: number;
      
      if (fillValue === 'interpolate') {
        // Linear interpolation
        const progress = j / (missingPoints + 1);
        fillY = sorted[i].y + (sorted[i + 1].y - sorted[i].y) * progress;
      } else if (fillValue === 'previous') {
        fillY = sorted[i].y;
      } else {
        fillY = fillValue;
      }
      
      result.push({
        x: fillDate,
        y: fillY,
        category: sorted[i].category,
        series: sorted[i].series,
        metadata: {
          filled: true,
          fillMethod: fillValue,
          originalGap: [sorted[i], sorted[i + 1]]
        }
      });
    }
  }
  
  result.push(sorted[sorted.length - 1]);
  return result;
}

/**
 * Stacks data for stacked charts
 */
export function stackData(
  data: ChartDataPoint[],
  stackBy: 'category' | 'series' = 'series'
): ChartDataPoint[] {
  // Group by x value
  const xGroups = new Map<any, ChartDataPoint[]>();
  data.forEach(point => {
    if (!xGroups.has(point.x)) {
      xGroups.set(point.x, []);
    }
    xGroups.get(point.x)!.push(point);
  });
  
  // Stack within each x group
  const result: ChartDataPoint[] = [];
  xGroups.forEach((points, x) => {
    // Sort by stack field for consistent stacking order
    points.sort((a, b) => {
      const aVal = a[stackBy] || '';
      const bVal = b[stackBy] || '';
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });
    
    let cumulative = 0;
    points.forEach(point => {
      const stackedPoint = {
        ...point,
        y0: cumulative,
        y: cumulative + point.y,
        metadata: {
          ...point.metadata,
          originalY: point.y,
          stackBase: cumulative,
          stackValue: point.y
        }
      };
      cumulative += point.y;
      result.push(stackedPoint);
    });
  });
  
  return result;
}

/**
 * Aggregates large datasets for better performance
 * Reduces the number of data points while preserving trends
 */
export function aggregateForPerformance(
  data: ChartDataPoint[],
  maxPoints: number = 500
): ChartDataPoint[] {
  if (data.length <= maxPoints) return data;
  
  // Calculate aggregation factor
  const factor = Math.ceil(data.length / maxPoints);
  const result: ChartDataPoint[] = [];
  
  for (let i = 0; i < data.length; i += factor) {
    const chunk = data.slice(i, i + factor);
    
    // Use the first point as base, aggregate the y values
    const aggregated: ChartDataPoint = {
      ...chunk[0],
      y: chunk.reduce((sum, point) => sum + point.y, 0) / chunk.length,
      metadata: {
        ...chunk[0].metadata,
        aggregated: true,
        originalCount: chunk.length,
        aggregationFactor: factor,
        aggregatedPoints: chunk
      }
    };
    
    result.push(aggregated);
  }
  
  return result;
}