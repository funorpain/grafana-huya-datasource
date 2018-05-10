///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['angular', 'lodash', 'app/core/utils/datemath'], function(exports_1) {
    var angular_1, lodash_1, dateMath;
    var OpenTsDatasource;
    return {
        setters:[
            function (angular_1_1) {
                angular_1 = angular_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (dateMath_1) {
                dateMath = dateMath_1;
            }],
        execute: function() {
            OpenTsDatasource = (function () {
                /** @ngInject */
                function OpenTsDatasource(instanceSettings, $q, backendSrv, templateSrv) {
                    this.$q = $q;
                    this.backendSrv = backendSrv;
                    this.templateSrv = templateSrv;
                    this.type = 'huya';
                    this.url = instanceSettings.url;
                    this.name = instanceSettings.name;
                    this.withCredentials = instanceSettings.withCredentials;
                    this.basicAuth = instanceSettings.basicAuth;
                    instanceSettings.jsonData = instanceSettings.jsonData || {};
                    this.tsdbVersion = instanceSettings.jsonData.tsdbVersion || 3;
                    this.tsdbResolution = instanceSettings.jsonData.tsdbResolution || 1;
                    this.supportMetrics = true;
                    this.tagKeys = {};
                    this.aggregatorsPromise = null;
                    this.filterTypesPromise = null;
                }
                // Called once per panel (graph)
                OpenTsDatasource.prototype.query = function (options) {
                    // console.log('options', options);
                    var start = this.convertToTSDBTime(options.rangeRaw.from, false);
                    var end = this.convertToTSDBTime(options.rangeRaw.to, true);
                    var qs = [];
                    var qsIndex = [];
                    lodash_1.default.each(options.targets, function (target, index) {
                        if (!target.metric) {
                            return;
                        }
                        var query = this.convertTargetToQuery(target, options);
                        if (query) {
                            lodash_1.default.each(query, function (item) {
                                var pos = lodash_1.default.findIndex(qs, function (o) {
                                    return lodash_1.default.isEqual(o, item);
                                });
                                if (pos === -1) {
                                    qs.push(item);
                                    qsIndex.push([index]);
                                }
                                else {
                                    qsIndex[pos].push(index);
                                }
                            });
                        }
                    }.bind(this));
                    var queries = lodash_1.default.compact(qs);
                    // No valid targets, return the empty result to save a round trip.
                    if (lodash_1.default.isEmpty(queries)) {
                        var d = this.$q.defer();
                        d.resolve({ data: [] });
                        return d.promise;
                    }
                    var groupByTags = {};
                    lodash_1.default.each(queries, function (query) {
                        if (query.filters && query.filters.length > 0) {
                            lodash_1.default.each(query.filters, function (val) {
                                groupByTags[val.tagk] = true;
                            });
                        }
                        else {
                            lodash_1.default.each(query.tags, function (val, key) {
                                groupByTags[key] = true;
                            });
                        }
                    });
                    // console.log('queries', queries);
                    // console.log('qsIndex', qsIndex);
                    return this.performTimeSeriesQuery(queries, start, end).then(function (response) {
                        var metricToTargetMapping = this.mapMetricsToTargets(response.data, options);
                        // console.log('response.data', response.data);
                        // console.log('metricToTargetMapping', metricToTargetMapping);
                        var result = [];
                        lodash_1.default.each(response.data, function (metricData, index) {
                            var indexes = qsIndex[metricToTargetMapping[index]];
                            lodash_1.default.each(indexes, function (index) {
                                var target = options.targets[index], metric = this.templateSrv.replace(target.metric, options.scopedVars, 'pipe'), avg = metric.endsWith('_avg');
                                if (!avg) {
                                    this._saveTagKeys(metricData);
                                    result.push(this.transformMetricData(metricData, groupByTags, target, options, this.tsdbResolution));
                                    return;
                                }
                                if (!metricData.metric.endsWith('_cnt')) {
                                    return;
                                }
                                var avgData = lodash_1.default.clone(metricData);
                                avgData.metric = avgData.metric.slice(0, -4) + '_avg';
                                this._saveTagKeys(avgData);
                                var sumList = [];
                                lodash_1.default.each(response.data, function (refData, refIndex) {
                                    if (refData.metric.endsWith('_sum') &&
                                        qsIndex[metricToTargetMapping[refIndex]].indexOf(index) !== -1 &&
                                        this.isSubsetOfTags(avgData.tags, refData.tags)) {
                                        sumList.push(refData);
                                    }
                                }.bind(this));
                                if (sumList.length === 0) {
                                    return;
                                }
                                this.processMetricData(avgData, sumList, target, options);
                                var firstData = lodash_1.default.find(avgData.dps, function (o) {
                                    return o !== null;
                                });
                                if (firstData === undefined) {
                                    return;
                                }
                                result.push(this.transformMetricData(avgData, groupByTags, target, options, this.tsdbResolution));
                            }.bind(this));
                        }.bind(this));
                        // console.log('result', result);
                        return { data: result };
                    }.bind(this));
                };
                OpenTsDatasource.prototype.isSubsetOfTags = function (a, b) {
                    for (var k in a) {
                        if (a[k] !== b[k]) {
                            return false;
                        }
                    }
                    return true;
                };
                OpenTsDatasource.prototype.annotationQuery = function (options) {
                    var start = this.convertToTSDBTime(options.rangeRaw.from, false);
                    var end = this.convertToTSDBTime(options.rangeRaw.to, true);
                    var qs = [];
                    var eventList = [];
                    qs.push({ aggregator: 'sum', metric: options.annotation.target });
                    var queries = lodash_1.default.compact(qs);
                    return this.performTimeSeriesQuery(queries, start, end).then(function (results) {
                        if (results.data[0]) {
                            var annotationObject = results.data[0].annotations;
                            if (options.annotation.isGlobal) {
                                annotationObject = results.data[0].globalAnnotations;
                            }
                            if (annotationObject) {
                                lodash_1.default.each(annotationObject, function (annotation) {
                                    var event = {
                                        text: annotation.description,
                                        time: Math.floor(annotation.startTime) * 1000,
                                        annotation: options.annotation,
                                    };
                                    eventList.push(event);
                                });
                            }
                        }
                        return eventList;
                    }.bind(this));
                };
                OpenTsDatasource.prototype.targetContainsTemplate = function (target) {
                    if (target.filters && target.filters.length > 0) {
                        for (var i = 0; i < target.filters.length; i++) {
                            if (this.templateSrv.variableExists(target.filters[i].filter)) {
                                return true;
                            }
                        }
                    }
                    if (target.tags && Object.keys(target.tags).length > 0) {
                        for (var tagKey in target.tags) {
                            if (this.templateSrv.variableExists(target.tags[tagKey])) {
                                return true;
                            }
                        }
                    }
                    return false;
                };
                OpenTsDatasource.prototype.performTimeSeriesQuery = function (queries, start, end) {
                    var msResolution = false;
                    if (this.tsdbResolution === 2) {
                        msResolution = true;
                    }
                    var reqBody = {
                        start: start,
                        queries: queries,
                        msResolution: msResolution,
                        globalAnnotations: true,
                    };
                    reqBody.showQuery = true;
                    // Relative queries (e.g. last hour) don't include an end time
                    if (end) {
                        reqBody.end = end;
                    }
                    var options = {
                        method: 'POST',
                        url: this.url + '/api/query',
                        data: reqBody,
                    };
                    this._addCredentialOptions(options);
                    return this.backendSrv.datasourceRequest(options);
                };
                OpenTsDatasource.prototype.suggestTagKeys = function (metric) {
                    return this.$q.when(this.tagKeys[metric] || []);
                };
                OpenTsDatasource.prototype._saveTagKeys = function (metricData) {
                    var tagKeys = Object.keys(metricData.tags);
                    lodash_1.default.each(metricData.aggregateTags, function (tag) {
                        tagKeys.push(tag);
                    });
                    this.tagKeys[metricData.metric] = tagKeys;
                };
                OpenTsDatasource.prototype._performSuggestQuery = function (query, type) {
                    return this._get('/api/suggest', { type: type, q: query, max: 1000 }).then(function (result) {
                        return result.data;
                    });
                };
                OpenTsDatasource.prototype._performMetricKeyValueLookup = function (metric, keys) {
                    if (!metric || !keys) {
                        return this.$q.when([]);
                    }
                    var keysArray = keys.split(',').map(function (key) {
                        return key.trim();
                    });
                    var key = keysArray[0];
                    var keysQuery = key + '=*';
                    if (keysArray.length > 1) {
                        keysQuery += ',' + keysArray.splice(1).join(',');
                    }
                    var m = metric + '{' + keysQuery + '}';
                    return this._get('/api/search/lookup', { m: m, limit: 3000 }).then(function (result) {
                        result = result.data.results;
                        var tagvs = [];
                        lodash_1.default.each(result, function (r) {
                            if (tagvs.indexOf(r.tags[key]) === -1) {
                                tagvs.push(r.tags[key]);
                            }
                        });
                        return tagvs;
                    });
                };
                OpenTsDatasource.prototype._performMetricKeyLookup = function (metric) {
                    if (!metric) {
                        return this.$q.when([]);
                    }
                    return this._get('/api/search/lookup', { m: metric, limit: 1000 }).then(function (result) {
                        result = result.data.results;
                        var tagks = [];
                        lodash_1.default.each(result, function (r) {
                            lodash_1.default.each(r.tags, function (tagv, tagk) {
                                if (tagks.indexOf(tagk) === -1) {
                                    tagks.push(tagk);
                                }
                            });
                        });
                        return tagks;
                    });
                };
                OpenTsDatasource.prototype._performThresholdMetricKeyValueLookup = function (threshold, tag, start, end, m) {
                    if (!tag || !start || !m) {
                        return this.$q.when([]);
                    }
                    return this._get('/api/query', { start: start, end: end, m: m }).then(function (result) {
                        var tagvs = [];
                        lodash_1.default.each(result.data, function (r) {
                            var value = lodash_1.default.find(r.dps, function (o) {
                                return o >= threshold;
                            });
                            if (value !== undefined) {
                                if (tagvs.indexOf(r.tags[tag]) === -1) {
                                    tagvs.push({
                                        text: r.tags[tag] + ' (' + value + ')',
                                        value: r.tags[tag],
                                        sortKey: value,
                                    });
                                }
                            }
                        });
                        tagvs = lodash_1.default.sortBy(tagvs, ['sortKey', 'text']);
                        tagvs.reverse();
                        return tagvs;
                    });
                };
                OpenTsDatasource.prototype._get = function (relativeUrl, params) {
                    var options = {
                        method: 'GET',
                        url: this.url + relativeUrl,
                        params: params,
                    };
                    this._addCredentialOptions(options);
                    return this.backendSrv.datasourceRequest(options);
                };
                OpenTsDatasource.prototype._performGetJson = function (url) {
                    return this.backendSrv
                        .datasourceRequest({
                        url: url,
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                    })
                        .then(function (result) {
                        if (result.data && lodash_1.default.isObject(result.data.data) && !lodash_1.default.isArray(result.data.data)) {
                            return lodash_1.default.map(result.data.data, function (value, key) {
                                return {
                                    text: value,
                                    value: key,
                                };
                            });
                        }
                        return [];
                    });
                };
                OpenTsDatasource.prototype._addCredentialOptions = function (options) {
                    if (this.basicAuth || this.withCredentials) {
                        options.withCredentials = true;
                    }
                    if (this.basicAuth) {
                        options.headers = { Authorization: this.basicAuth };
                    }
                };
                OpenTsDatasource.prototype.metricFindQuery = function (query) {
                    if (!query) {
                        return this.$q.when([]);
                    }
                    var interpolated;
                    try {
                        interpolated = this.templateSrv.replace(query, {}, 'distributed');
                    }
                    catch (err) {
                        return this.$q.reject(err);
                    }
                    var responseTransform = function (result) {
                        return lodash_1.default.map(result, function (value) {
                            return { text: value };
                        });
                    };
                    var metrics_regex = /metrics\((.*)\)/;
                    var tag_names_regex = /tag_names\((.*)\)/;
                    var tag_values_regex = /tag_values\((.*?),\s?(.*)\)/;
                    var threshold_tag_values_regex = /tag_threshold_values\((.*?),\s?(.*?),\s?(.*?),\s?(.*?),\s?(.*)\)/;
                    var tag_names_suggest_regex = /suggest_tagk\((.*)\)/;
                    var tag_values_suggest_regex = /suggest_tagv\((.*)\)/;
                    var getjson_regex = /getjson\((.*)\)/;
                    var metrics_query = interpolated.match(metrics_regex);
                    if (metrics_query) {
                        return this._performSuggestQuery(metrics_query[1], 'metrics').then(responseTransform);
                    }
                    var tag_names_query = interpolated.match(tag_names_regex);
                    if (tag_names_query) {
                        return this._performMetricKeyLookup(tag_names_query[1]).then(responseTransform);
                    }
                    var tag_values_query = interpolated.match(tag_values_regex);
                    if (tag_values_query) {
                        return this._performMetricKeyValueLookup(tag_values_query[1], tag_values_query[2]).then(responseTransform);
                    }
                    var threshold_tag_values_query = interpolated.match(threshold_tag_values_regex);
                    if (threshold_tag_values_query) {
                        return this._performThresholdMetricKeyValueLookup(threshold_tag_values_query[1], threshold_tag_values_query[2], threshold_tag_values_query[3], threshold_tag_values_query[4], threshold_tag_values_query[5]);
                    }
                    var tag_names_suggest_query = interpolated.match(tag_names_suggest_regex);
                    if (tag_names_suggest_query) {
                        return this._performSuggestQuery(tag_names_suggest_query[1], 'tagk').then(responseTransform);
                    }
                    var tag_values_suggest_query = interpolated.match(tag_values_suggest_regex);
                    if (tag_values_suggest_query) {
                        return this._performSuggestQuery(tag_values_suggest_query[1], 'tagv').then(responseTransform);
                    }
                    var getjson_query = interpolated.match(getjson_regex);
                    if (getjson_query) {
                        return this._performGetJson(getjson_query[1]);
                    }
                    return this.$q.when([]);
                };
                OpenTsDatasource.prototype.testDatasource = function () {
                    return this._performSuggestQuery('cpu', 'metrics').then(function () {
                        return { status: 'success', message: 'Data source is working' };
                    });
                };
                OpenTsDatasource.prototype.getAggregators = function () {
                    if (this.aggregatorsPromise) {
                        return this.aggregatorsPromise;
                    }
                    this.aggregatorsPromise = this._get('/api/aggregators').then(function (result) {
                        if (result.data && lodash_1.default.isArray(result.data)) {
                            return result.data.sort();
                        }
                        return [];
                    });
                    return this.aggregatorsPromise;
                };
                OpenTsDatasource.prototype.getFilterTypes = function () {
                    if (this.filterTypesPromise) {
                        return this.filterTypesPromise;
                    }
                    this.filterTypesPromise = this._get('/api/config/filters').then(function (result) {
                        if (result.data) {
                            return Object.keys(result.data).sort();
                        }
                        return [];
                    });
                    return this.filterTypesPromise;
                };
                OpenTsDatasource.prototype.processMetricData = function (metricData, refData, target, options) {
                    var dps = {};
                    var threshold = target.threshold ? this.templateSrv.replace(target.threshold, options.scopedVars, 'pipe') : 0;
                    lodash_1.default.each(metricData.dps, function (value, key) {
                        if (value >= threshold && value > 0) {
                            var sum = 0;
                            for (var i = 0, n = refData.length; i < n; i++) {
                                var v = refData[i].dps[key];
                                if (v) {
                                    sum += v;
                                }
                            }
                            dps[key] = sum / value;
                        }
                        else {
                            dps[key] = null;
                        }
                    });
                    metricData.dps = dps;
                };
                OpenTsDatasource.prototype.transformMetricData = function (md, groupByTags, target, options, tsdbResolution) {
                    var metricLabel = this.createMetricLabel(md, target, groupByTags, options);
                    var dps = [];
                    // TSDB returns datapoints has a hash of ts => value.
                    // Can't use _.pairs(invert()) because it stringifies keys/values
                    lodash_1.default.each(md.dps, function (v, k) {
                        if (tsdbResolution === 2) {
                            dps.push([v, k * 1]);
                        }
                        else {
                            dps.push([v, k * 1000]);
                        }
                    });
                    return { target: metricLabel, datapoints: dps };
                };
                OpenTsDatasource.prototype.createMetricLabel = function (md, target, groupByTags, options) {
                    if (target.alias) {
                        var scopedVars = lodash_1.default.clone(options.scopedVars || {});
                        lodash_1.default.each(md.tags, function (value, key) {
                            scopedVars['tag_' + key] = { value: value };
                        });
                        return this.templateSrv.replace(target.alias, scopedVars);
                    }
                    var label = md.metric;
                    var tagData = [];
                    if (!lodash_1.default.isEmpty(md.tags)) {
                        lodash_1.default.each(lodash_1.default.toPairs(md.tags), function (tag) {
                            if (lodash_1.default.has(groupByTags, tag[0])) {
                                tagData.push(tag[0] + '=' + tag[1]);
                            }
                        });
                    }
                    if (!lodash_1.default.isEmpty(tagData)) {
                        label += '{' + tagData.join(', ') + '}';
                    }
                    return label;
                };
                OpenTsDatasource.prototype.convertTargetToQuery = function (target, options) {
                    if (!target.metric || target.hide) {
                        return null;
                    }
                    var query = {
                        metric: this.templateSrv.replace(target.metric, options.scopedVars, 'pipe'),
                        aggregator: target.aggregator || 'sum',
                    };
                    if (!query.metric.match(/_(sum|cnt|avg)$/)) {
                        return null;
                    }
                    var avg = query.metric.endsWith('_avg');
                    if (!target.disableDownsampling) {
                        var interval = this.templateSrv.replace(target.downsampleInterval || options.interval);
                        if (interval.match(/\.[0-9]+s/)) {
                            interval = parseFloat(interval) * 1000 + 'ms';
                        }
                        query.downsample = interval + '-' + query.aggregator;
                        query.downsample += '-' + 'null';
                    }
                    if (target.filters && target.filters.length > 0) {
                        query.filters = angular_1.default.copy(target.filters);
                        if (query.filters) {
                            for (var filter_key in query.filters) {
                                query.filters[filter_key].filter = this.templateSrv.replace(query.filters[filter_key].filter, options.scopedVars, 'pipe');
                                // replace literal_or(*) to wildcard(*)
                                if (query.filters[filter_key].filter === '*' && query.filters[filter_key].type === 'literal_or') {
                                    query.filters[filter_key].type = 'wildcard';
                                }
                            }
                        }
                    }
                    else {
                        query.tags = angular_1.default.copy(target.tags);
                        if (query.tags) {
                            for (var tag_key in query.tags) {
                                query.tags[tag_key] = this.templateSrv.replace(query.tags[tag_key], options.scopedVars, 'pipe');
                            }
                        }
                    }
                    if (target.explicitTags) {
                        query.explicitTags = true;
                    }
                    if (!avg) {
                        return [query];
                    }
                    query.metric = query.metric.slice(0, -4) + '_sum';
                    var cntQuery = angular_1.default.copy(query);
                    cntQuery.metric = cntQuery.metric.slice(0, -4) + '_cnt';
                    return [query, cntQuery];
                };
                OpenTsDatasource.prototype.mapMetricsToTargets = function (metrics, options) {
                    return lodash_1.default.map(metrics, function (metricData) {
                        return metricData.query.index;
                    });
                };
                OpenTsDatasource.prototype.convertToTSDBTime = function (date, roundUp) {
                    if (date === 'now') {
                        return null;
                    }
                    date = dateMath.parse(date, roundUp);
                    return date.valueOf();
                };
                return OpenTsDatasource;
            })();
            exports_1("default", OpenTsDatasource);
        }
    }
});
//# sourceMappingURL=datasource.js.map