/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
export default class OpenTsDatasource {
    private $q;
    private backendSrv;
    private templateSrv;
    type: any;
    url: any;
    name: any;
    withCredentials: any;
    basicAuth: any;
    tsdbVersion: any;
    tsdbResolution: any;
    supportMetrics: any;
    tagKeys: any;
    aggregatorsPromise: any;
    filterTypesPromise: any;
    /** @ngInject */
    constructor(instanceSettings: any, $q: any, backendSrv: any, templateSrv: any);
    query(options: any): any;
    isSubsetOfTags(a: any, b: any): boolean;
    annotationQuery(options: any): any;
    targetContainsTemplate(target: any): boolean;
    performTimeSeriesQuery(queries: any, start: any, end: any): any;
    suggestTagKeys(metric: any): any;
    _saveTagKeys(metricData: any): void;
    _performSuggestQuery(query: any, type: any): any;
    _performMetricKeyValueLookup(metric: any, keys: any): any;
    _performMetricKeyLookup(metric: any): any;
    _performThresholdMetricKeyValueLookup(threshold: any, tag: any, start: any, end: any, m: any): any;
    _get(relativeUrl: any, params?: any): any;
    _performGetJson(url: any): any;
    _addCredentialOptions(options: any): void;
    metricFindQuery(query: any): any;
    testDatasource(): any;
    getAggregators(): any;
    getFilterTypes(): any;
    processMetricData(metricData: any, refData: any, target: any, options: any): void;
    transformMetricData(md: any, groupByTags: any, target: any, options: any, tsdbResolution: any): {
        target: any;
        datapoints: any[];
    };
    createMetricLabel(md: any, target: any, groupByTags: any, options: any): any;
    convertTargetToQuery(target: any, options: any): any[];
    mapMetricsToTargets(metrics: any, options: any): any;
    convertToTSDBTime(date: any, roundUp: any): any;
}
