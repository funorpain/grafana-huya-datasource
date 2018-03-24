/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import { QueryCtrl } from 'app/plugins/sdk';
export declare class OpenTsQueryCtrl extends QueryCtrl {
    static templateUrl: string;
    fillPolicies: any;
    filterTypes: any;
    tsdbVersion: any;
    downsampleInterval: any;
    errors: any;
    suggestMetrics: any;
    suggestTagKeys: any;
    suggestTagValues: any;
    addTagMode: boolean;
    addFilterMode: boolean;
    /** @ngInject **/
    constructor($scope: any, $injector: any);
    targetBlur(): void;
    getTextValues(metricFindResult: any): any;
    addTag(): void;
    removeTag(key: any): void;
    editTag(key: any, value: any): void;
    closeAddTagMode(): void;
    addFilter(): void;
    removeFilter(index: any): void;
    editFilter(fil: any, index: any): void;
    closeAddFilterMode(): void;
    validateTarget(): any;
}